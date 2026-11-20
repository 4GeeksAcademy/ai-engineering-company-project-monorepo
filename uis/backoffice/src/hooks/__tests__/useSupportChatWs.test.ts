import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSupportChatWS } from "../useSupportChatWs";

class MockWebSocket {
    static OPEN = 1;
    static CLOSED = 3;
    static instances: MockWebSocket[] = [];

    url: string;
    readyState = MockWebSocket.OPEN;
    sent: string[] = [];
    onopen: ((ev?: Event) => void) | null = null;
    onmessage: ((ev: { data: string }) => void) | null = null;
    onclose: ((ev: { code: number }) => void) | null = null;
    onerror: ((ev?: Event) => void) | null = null;

    constructor(url: string) {
        this.url = url;
        MockWebSocket.instances.push(this);
    }

    send(data: string) {
        this.sent.push(data);
    }

    close(code = 1000) {
        this.readyState = MockWebSocket.CLOSED;
        this.onclose?.({ code });
    }

    emitOpen() {
        this.readyState = MockWebSocket.OPEN;
        this.onopen?.();
    }

    emitServerEvent(event: string, data: Record<string, unknown>) {
        this.onmessage?.({ data: JSON.stringify({ event, data }) });
    }
}

describe("useSupportChatWS", () => {
    beforeEach(() => {
        MockWebSocket.instances = [];
        vi.stubGlobal("WebSocket", MockWebSocket);
        localStorage.setItem("access_token", "test-jwt-token");
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        localStorage.clear();
    });

    it("conecta con JWT y sessionId, y rehidrata session_snapshot", () => {
        const { result } = renderHook(() =>
            useSupportChatWS({ sessionId: "chat_test_1", enabled: true })
        );

        expect(MockWebSocket.instances).toHaveLength(1);
        const ws = MockWebSocket.instances[0];
        expect(ws.url).toContain("/agent/ws/chat_test_1");
        expect(ws.url).toContain("token=test-jwt-token");

        act(() => {
            ws.emitOpen();
            ws.emitServerEvent("session_snapshot", {
                session_id: "chat_test_1",
                messages: [
                    {
                        message_id: "msg_1",
                        session_id: "chat_test_1",
                        role: "user",
                        content: "Hola",
                        status: "completed",
                        created_at: "2026-11-20T00:00:00Z",
                    },
                ],
            });
        });

        expect(result.current.connectionStatus).toBe("connected");
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].content).toBe("Hola");
    });

    it("streamea tokens, interrumpe en vuelo y descarta tokens residuales del turno viejo", () => {
        const { result } = renderHook(() =>
            useSupportChatWS({ sessionId: "chat_test_2", enabled: true })
        );
        const ws = MockWebSocket.instances[0];

        act(() => {
            ws.emitOpen();
            ws.emitServerEvent("session_snapshot", {
                session_id: "chat_test_2",
                messages: [],
            });
        });

        act(() => {
            result.current.sendMessage("¿Garantía?");
        });

        expect(result.current.isGenerating).toBe(true);

        act(() => {
            ws.emitServerEvent("token_chunk", {
                session_id: "chat_test_2",
                message_id: "msg_turn1",
                token: "La ",
                sequence: 1,
            });
        });

        // Usuario interrumpe y redirige antes de que termine el turno 1
        act(() => {
            result.current.sendMessage("Sobre SLAs de P1");
        });

        // Llega un token residual del turno 1 después del interrupt: debe ser descartado
        act(() => {
            ws.emitServerEvent("token_chunk", {
                session_id: "chat_test_2",
                message_id: "msg_turn1",
                token: "garantía ",
                sequence: 2,
            });
            ws.emitServerEvent("generation_interrupted", {
                session_id: "chat_test_2",
                message_id: "msg_turn1",
                status: "interrupted",
            });
        });

        // Arranca el turno 2
        act(() => {
            ws.emitServerEvent("token_chunk", {
                session_id: "chat_test_2",
                message_id: "msg_turn2",
                token: "SLA P1 es 60m.",
                sequence: 1,
            });
            ws.emitServerEvent("generation_completed", {
                session_id: "chat_test_2",
                message_id: "msg_turn2",
            });
        });

        const msgs = result.current.messages;
        expect(msgs).toHaveLength(4);
        expect(msgs[1].status).toBe("interrupted");
        expect(msgs[1].content).toBe("La ");
        expect(msgs[2].content).toBe("Sobre SLAs de P1");
        expect(msgs[3].status).toBe("completed");
        expect(msgs[3].content).toBe("SLA P1 es 60m.");
    });

    it("reconecta con backoff exponencial tras una caída de red", () => {
        const { result } = renderHook(() =>
            useSupportChatWS({ sessionId: "chat_test_3", enabled: true })
        );
        const ws = MockWebSocket.instances[0];

        act(() => {
            ws.emitOpen();
            ws.close(1006);
        });

        expect(result.current.connectionStatus).toBe("reconnecting");
        expect(result.current.reconnectAttempt).toBe(1);

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(MockWebSocket.instances).toHaveLength(2);
    });
});
