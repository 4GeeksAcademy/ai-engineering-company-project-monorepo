"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ChatMessageItem {
    message_id: string;
    session_id: string;
    role: "user" | "assistant";
    content: string;
    status: "streaming" | "completed" | "interrupted";
    created_at: string;
}

export type WSConnectionStatus =
    | "connecting"
    | "connected"
    | "reconnecting"
    | "disconnected";

interface UseSupportChatWSOptions {
    sessionId: string;
    enabled?: boolean;
}

export function useSupportChatWS({
    sessionId,
    enabled = true,
}: UseSupportChatWSOptions) {
    const [messages, setMessages] = useState<ChatMessageItem[]>([]);
    const [connectionStatus, setConnectionStatus] =
        useState<WSConnectionStatus>("connecting");
    const [reconnectAttempt, setReconnectAttempt] = useState(0);

    const wsRef = useRef<WebSocket | null>(null);

    const isGenerating = messages.some(
        (m) => m.role === "assistant" && m.status === "streaming"
    );

    useEffect(() => {
        if (!enabled || !sessionId || typeof window === "undefined") {
            setConnectionStatus("disconnected");
            return;
        }

        let isCancelled = false;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;
        let attempt = 0;

        const buildWsUrl = (token: string) => {
            const explicitBase = process.env.NEXT_PUBLIC_WS_URL;
            if (explicitBase) {
                return `${explicitBase.replace(/\/$/, "")}/agent/ws/${encodeURIComponent(
                    sessionId
                )}?token=${encodeURIComponent(token)}`;
            }
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const host = window.location.hostname || "127.0.0.1";
            return `${protocol}//${host}:8000/agent/ws/${encodeURIComponent(
                sessionId
            )}?token=${encodeURIComponent(token)}`;
        };

        const scheduleReconnect = () => {
            if (isCancelled) return;
            attempt += 1;
            setReconnectAttempt(attempt);
            setConnectionStatus("reconnecting");

            const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
            const jitter = Math.floor(Math.random() * 500);
            retryTimer = setTimeout(() => {
                if (!isCancelled) connect();
            }, baseDelay + jitter);
        };

        const handleServerFrame = (raw: string) => {
            try {
                const frame = JSON.parse(raw) as {
                    event: string;
                    data: Record<string, unknown>;
                };
                const { event, data } = frame;

                if (event === "session_snapshot") {
                    const snapshotMessages = Array.isArray(data.messages)
                        ? (data.messages as ChatMessageItem[])
                        : [];
                    setMessages(snapshotMessages);
                } else if (event === "token_chunk") {
                    const token = String(data.token ?? "");
                    const msgId = String(data.message_id ?? "");
                    setMessages((prev) => {
                        if (msgId) {
                            const existingIdx = prev.findIndex(
                                (m) => m.message_id === msgId
                            );
                            if (existingIdx !== -1) {
                                const existing = prev[existingIdx];
                                if (existing.status === "interrupted") {
                                    // Descarta tokens residuales en vuelo de un turno ya interrumpido
                                    return prev;
                                }
                                const updated = [...prev];
                                updated[existingIdx] = {
                                    ...existing,
                                    content: existing.content + token,
                                };
                                return updated;
                            }
                            const placeholderIdx = prev.findIndex(
                                (m) =>
                                    m.role === "assistant" &&
                                    m.status === "streaming" &&
                                    m.message_id.startsWith("local_assistant_")
                            );
                            if (placeholderIdx !== -1) {
                                const updated = [...prev];
                                updated[placeholderIdx] = {
                                    ...updated[placeholderIdx],
                                    message_id: msgId,
                                    content: updated[placeholderIdx].content + token,
                                };
                                return updated;
                            }
                        }

                        const last = prev[prev.length - 1];
                        if (last && last.role === "assistant" && last.status === "streaming") {
                            return [
                                ...prev.slice(0, -1),
                                {
                                    ...last,
                                    message_id: msgId || last.message_id,
                                    content: last.content + token,
                                },
                            ];
                        }
                        return [
                            ...prev,
                            {
                                message_id: msgId || `streaming_${Date.now()}`,
                                session_id: sessionId,
                                role: "assistant",
                                content: token,
                                status: "streaming",
                                created_at: new Date().toISOString(),
                            },
                        ];
                    });
                } else if (event === "generation_interrupted") {
                    const msgId = String(data.message_id ?? "");
                    setMessages((prev) => {
                        const streamingIdx = prev.findIndex(
                            (m) => m.role === "assistant" && m.status === "streaming"
                        );
                        if (streamingIdx !== -1) {
                            const updated = [...prev];
                            updated[streamingIdx] = {
                                ...updated[streamingIdx],
                                message_id: msgId || updated[streamingIdx].message_id,
                                status: "interrupted",
                            };
                            return updated;
                        }
                        const localInterruptedIdx = prev.findLastIndex(
                            (m) =>
                                m.role === "assistant" &&
                                m.status === "interrupted" &&
                                m.message_id.startsWith("local_assistant_")
                        );
                        if (localInterruptedIdx !== -1 && msgId) {
                            const updated = [...prev];
                            updated[localInterruptedIdx] = {
                                ...updated[localInterruptedIdx],
                                message_id: msgId,
                            };
                            return updated;
                        }
                        return prev;
                    });
                } else if (event === "generation_completed") {
                    const msgId = String(data.message_id ?? "");
                    setMessages((prev) => {
                        const idx = prev.findLastIndex(
                            (m) => m.role === "assistant" && m.status === "streaming"
                        );
                        if (idx === -1) return prev;
                        const updated = [...prev];
                        updated[idx] = {
                            ...updated[idx],
                            message_id: msgId || updated[idx].message_id,
                            status: "completed",
                        };
                        return updated;
                    });
                }
            } catch (err) {
                console.error("Error procesando frame WebSocket:", err);
            }
        };

        const connect = () => {
            if (isCancelled) return;
            const token = localStorage.getItem("access_token");
            if (!token) {
                setConnectionStatus("disconnected");
                return;
            }

            setConnectionStatus(attempt > 0 ? "reconnecting" : "connecting");
            const ws = new WebSocket(buildWsUrl(token));
            wsRef.current = ws;

            ws.onopen = () => {
                if (isCancelled) {
                    ws.close();
                    return;
                }
                attempt = 0;
                setReconnectAttempt(0);
                setConnectionStatus("connected");
            };

            ws.onmessage = (evt) => {
                if (typeof evt.data === "string") {
                    handleServerFrame(evt.data);
                }
            };

            ws.onclose = (evt) => {
                wsRef.current = null;
                if (isCancelled) return;
                if (evt.code === 1008) {
                    setConnectionStatus("disconnected");
                    window.location.href = "/login";
                    return;
                }
                scheduleReconnect();
            };

            ws.onerror = () => {
                // `onclose` gestionará el backoff exponencial
            };
        };

        connect();

        return () => {
            isCancelled = true;
            if (retryTimer) clearTimeout(retryTimer);
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [sessionId, enabled]);

    const interruptGeneration = useCallback(
        (newInput?: string) => {
            const ws = wsRef.current;
            if (!ws || ws.readyState !== WebSocket.OPEN) return;

            const trimmed = newInput?.trim() ?? "";
            ws.send(
                JSON.stringify({
                    event: "interrupt_requested",
                    data: {
                        session_id: sessionId,
                        new_input: trimmed,
                    },
                })
            );

            if (trimmed) {
                const now = new Date().toISOString();
                setMessages((prev) => {
                    const updated = prev.map((m) =>
                        m.role === "assistant" && m.status === "streaming"
                            ? { ...m, status: "interrupted" as const }
                            : m
                    );
                    return [
                        ...updated,
                        {
                            message_id: `local_user_${Date.now()}`,
                            session_id: sessionId,
                            role: "user",
                            content: trimmed,
                            status: "completed",
                            created_at: now,
                        },
                    ];
                });
            }
        },
        [sessionId]
    );

    const sendMessage = useCallback(
        (text: string) => {
            const trimmed = text.trim();
            if (!trimmed) return;

            const ws = wsRef.current;
            if (!ws || ws.readyState !== WebSocket.OPEN) return;

            if (isGenerating) {
                interruptGeneration(trimmed);
                return;
            }

            const now = new Date().toISOString();
            setMessages((prev) => [
                ...prev,
                {
                    message_id: `local_user_${Date.now()}`,
                    session_id: sessionId,
                    role: "user",
                    content: trimmed,
                    status: "completed",
                    created_at: now,
                },
                {
                    message_id: `local_assistant_${Date.now()}`,
                    session_id: sessionId,
                    role: "assistant",
                    content: "",
                    status: "streaming",
                    created_at: now,
                },
            ]);

            ws.send(
                JSON.stringify({
                    event: "user_message",
                    data: {
                        session_id: sessionId,
                        text: trimmed,
                    },
                })
            );
        },
        [sessionId, isGenerating, interruptGeneration]
    );

    return {
        messages,
        connectionStatus,
        reconnectAttempt,
        isGenerating,
        sendMessage,
        interruptGeneration,
    };
}