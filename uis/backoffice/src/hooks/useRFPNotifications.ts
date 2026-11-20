"use client";

import { useEffect, useRef, useState } from "react";

export interface RFPTicketCreatedPayload {
    ticket_id: string;
    rfp_id: string;
    filename: string;
    status: string;
    client_name?: string | null;
    created_at: string;
}

export type SSEConnectionStatus =
    | "connecting"
    | "connected"
    | "reconnecting"
    | "disconnected";

interface UseRFPNotificationsOptions {
    onTicketCreated: (payload: RFPTicketCreatedPayload) => void;
    onReconnect?: () => void | Promise<void>;
    enabled?: boolean;
}

export function useRFPNotifications({
    onTicketCreated,
    onReconnect,
    enabled = true,
}: UseRFPNotificationsOptions) {
    const [connectionStatus, setConnectionStatus] =
        useState<SSEConnectionStatus>("connecting");
    const [reconnectAttempt, setReconnectAttempt] = useState(0);
    const [lastEvent, setLastEvent] =
        useState<RFPTicketCreatedPayload | null>(null);

    const onTicketCreatedRef = useRef(onTicketCreated);
    const onReconnectRef = useRef(onReconnect);

    useEffect(() => {
        onTicketCreatedRef.current = onTicketCreated;
    }, [onTicketCreated]);

    useEffect(() => {
        onReconnectRef.current = onReconnect;
    }, [onReconnect]);

    useEffect(() => {
        if (!enabled || typeof window === "undefined") {
            setConnectionStatus("disconnected");
            return;
        }

        let isCancelled = false;
        let abortController: AbortController | null = null;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;
        let hasConnectedBefore = false;
        let attempt = 0;

        const scheduleReconnect = () => {
            if (isCancelled) return;
            attempt += 1;
            setReconnectAttempt(attempt);
            setConnectionStatus("reconnecting");

            const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
            const jitter = Math.floor(Math.random() * 500);
            retryTimer = setTimeout(() => {
                if (!isCancelled) {
                    connect();
                }
            }, baseDelay + jitter);
        };

        const processFrame = (rawFrame: string) => {
            const lines = rawFrame.split("\n");
            let eventName = "message";
            const dataLines: string[] = [];

            for (const line of lines) {
                if (!line || line.startsWith(":")) {
                    // Línea vacía o comentario keep-alive (`: ping`)
                    continue;
                }
                if (line.startsWith("event:")) {
                    eventName = line.slice("event:".length).trim();
                } else if (line.startsWith("data:")) {
                    dataLines.push(line.slice("data:".length).trim());
                }
            }

            if (dataLines.length === 0) return;

            if (eventName === "rfp_ticket_created") {
                try {
                    const payload = JSON.parse(
                        dataLines.join("\n")
                    ) as RFPTicketCreatedPayload;
                    setLastEvent(payload);
                    onTicketCreatedRef.current(payload);
                } catch (err) {
                    console.error("Error parseando payload SSE rfp_ticket_created:", err);
                }
            }
        };

        const connect = async () => {
            if (isCancelled) return;

            const token = localStorage.getItem("access_token");
            if (!token) {
                setConnectionStatus("disconnected");
                return;
            }

            abortController = new AbortController();
            setConnectionStatus(attempt > 0 ? "reconnecting" : "connecting");

            try {
                const response = await fetch("/api/rfps/stream", {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "text/event-stream",
                    },
                    cache: "no-store",
                    signal: abortController.signal,
                });

                if (response.status === 401) {
                    setConnectionStatus("disconnected");
                    window.location.href = "/login";
                    return;
                }

                if (!response.ok || !response.body) {
                    throw new Error(`SSE HTTP ${response.status}`);
                }

                // Conexión establecida con éxito
                const wasReconnect = hasConnectedBefore;
                hasConnectedBefore = true;
                attempt = 0;
                setReconnectAttempt(0);
                setConnectionStatus("connected");

                if (wasReconnect) {
                    // Estrategia de recuperación: refetch al reconectar para no perder tickets
                    await onReconnectRef.current?.();
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder("utf-8");
                let buffer = "";

                while (!isCancelled) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    buffer += decoder
                        .decode(value, { stream: true })
                        .replace(/\r\n/g, "\n");

                    let boundaryIndex = buffer.indexOf("\n\n");
                    while (boundaryIndex !== -1) {
                        const frame = buffer.slice(0, boundaryIndex);
                        buffer = buffer.slice(boundaryIndex + 2);
                        if (frame.trim().length > 0) {
                            processFrame(frame);
                        }
                        boundaryIndex = buffer.indexOf("\n\n");
                    }
                }

                // Si el stream se cerró desde el servidor sin cancelar el componente, reconectamos
                if (!isCancelled) {
                    scheduleReconnect();
                }
            } catch (err: unknown) {
                if (isCancelled) return;
                if (err instanceof DOMException && err.name === "AbortError") {
                    return;
                }
                scheduleReconnect();
            }
        };

        connect();

        return () => {
            isCancelled = true;
            if (retryTimer) clearTimeout(retryTimer);
            if (abortController) abortController.abort();
        };
    }, [enabled]);

    return {
        connectionStatus,
        reconnectAttempt,
        lastEvent,
    };
}