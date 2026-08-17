/**
 * Brasaland backoffice SSE client.
 * Uses fetch + ReadableStream so the backoffice JWT can be sent as
 * Authorization: Bearer (EventSource cannot set that header).
 */
(function (global) {
    const TICKET_EVENTS = new Set([
        "emergency_order_created",
        "waste_escalation_created",
    ]);
    const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000];

    function parseSseBlock(block) {
        let eventName = "message";
        let id = null;
        const dataLines = [];
        const lines = String(block || "").split("\n");
        for (let i = 0; i < lines.length; i += 1) {
            const line = lines[i].replace(/\r$/, "");
            if (!line || line.startsWith(":")) {
                continue;
            }
            const colon = line.indexOf(":");
            const field = colon === -1 ? line : line.slice(0, colon);
            let value = colon === -1 ? "" : line.slice(colon + 1);
            if (value.startsWith(" ")) {
                value = value.slice(1);
            }
            if (field === "event") {
                eventName = value;
            } else if (field === "id") {
                id = value;
            } else if (field === "data") {
                dataLines.push(value);
            }
        }
        if (dataLines.length === 0) {
            return null;
        }
        return { event: eventName, id, data: dataLines.join("\n") };
    }

    function backoffDelay(attempt) {
        return BACKOFF_MS[Math.min(Math.max(attempt, 0), BACKOFF_MS.length - 1)];
    }

    function wait(ms, signal) {
        return new Promise((resolve) => {
            if (signal.aborted) {
                resolve();
                return;
            }
            const timer = setTimeout(resolve, ms);
            signal.addEventListener(
                "abort",
                () => {
                    clearTimeout(timer);
                    resolve();
                },
                { once: true },
            );
        });
    }

    async function consumeReadableStream(response, onEvent, signal) {
        const body = response.body;
        if (!body || typeof body.getReader !== "function") {
            throw new Error("SSE response is not a ReadableStream");
        }
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        try {
            while (!signal.aborted) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                buffer += decoder.decode(value, { stream: true });
                const frames = buffer.split("\n\n");
                buffer = frames.pop() || "";
                for (let i = 0; i < frames.length; i += 1) {
                    const parsed = parseSseBlock(frames[i]);
                    if (parsed) {
                        onEvent(parsed);
                    }
                }
            }
        } finally {
            try {
                await reader.cancel();
            } catch (_error) {
                /* stream already closed */
            }
        }
    }

    function connect(options) {
        const url = options.url;
        const getToken = options.getToken;
        const getLastEventId = options.getLastEventId;
        const onTicket = options.onTicket;
        const onStatus = options.onStatus || function () {};
        const onUnauthorized = options.onUnauthorized || function () {};
        const onBeforeReconnect = options.onBeforeReconnect || async function () {};

        let stopped = false;
        const sessionAbort = new AbortController();
        let fetchAbort = null;

        function stop() {
            stopped = true;
            sessionAbort.abort();
            if (fetchAbort) {
                fetchAbort.abort();
            }
        }

        async function loop() {
            let attempt = 0;
            while (!stopped) {
                const token = getToken();
                if (!token) {
                    onUnauthorized();
                    return;
                }
                fetchAbort = new AbortController();
                const onSessionAbort = () => fetchAbort.abort();
                sessionAbort.signal.addEventListener("abort", onSessionAbort);
                try {
                    onStatus("connecting", "Connecting");
                    const headers = {
                        Accept: "text/event-stream",
                        Authorization: `Bearer ${token}`,
                    };
                    const lastEventId = getLastEventId ? getLastEventId() : "";
                    if (lastEventId) {
                        headers["Last-Event-ID"] = lastEventId;
                    }
                    const response = await fetch(url, {
                        method: "GET",
                        headers,
                        signal: fetchAbort.signal,
                        cache: "no-store",
                    });
                    if (response.status === 401) {
                        onUnauthorized();
                        return;
                    }
                    if (!response.ok) {
                        throw new Error(`Stream failed (${response.status})`);
                    }
                    attempt = 0;
                    onStatus("live", "Live");
                    await consumeReadableStream(
                        response,
                        (parsed) => {
                            if (!TICKET_EVENTS.has(parsed.event)) {
                                return;
                            }
                            let ticket;
                            try {
                                ticket = JSON.parse(parsed.data);
                            } catch (_error) {
                                return;
                            }
                            onTicket(ticket, parsed);
                        },
                        fetchAbort.signal,
                    );
                    if (stopped) {
                        return;
                    }
                    throw new Error("Stream closed");
                } catch (error) {
                    if (stopped || (error && error.name === "AbortError")) {
                        return;
                    }
                    const waitMs = backoffDelay(attempt);
                    attempt += 1;
                    onStatus("reconnecting", `Reconnect ${Math.round(waitMs / 1000)}s`);
                    await wait(waitMs, sessionAbort.signal);
                    if (stopped) {
                        return;
                    }
                    await onBeforeReconnect();
                } finally {
                    sessionAbort.signal.removeEventListener("abort", onSessionAbort);
                }
            }
        }

        loop();
        return { stop };
    }

    global.BrasalandTicketStream = {
        TICKET_EVENTS,
        parseSseBlock,
        backoffDelay,
        connect,
    };
})(window);
