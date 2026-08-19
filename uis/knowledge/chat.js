/**
 * Brasaland knowledge-assistant WebSocket client (uis/knowledge).
 * Existing /knowledge/ chat: persistent socket, streamed tokens.
 * Named events: docs/10-realtime/communication/CONTEXT-company.md
 */
(function () {
    const EVENT_USER_MESSAGE = "knowledge_user_message";
    const EVENT_INTERRUPT = "knowledge_interrupt";
    const EVENT_AUTH = "knowledge_auth";
    const EVENT_SESSION = "knowledge_session";
    const EVENT_TOKEN = "knowledge_token";
    const EVENT_ASSISTANT_MESSAGE = "knowledge_assistant_message";
    const EVENT_ERROR = "knowledge_error";
    const TOKEN_KEY = "brasaland-backoffice-token";
    const SESSION_KEY = "brasaland-knowledge-session-id";
    const LOG_KEY = "brasaland-knowledge-chat-log";
    const WS_CLOSE_UNAUTHORIZED = 4401;
    const WS_CLOSE_NO_THREAD = 4404;

    const loginPanel = document.getElementById("login-panel");
    const loginForm = document.getElementById("login-form");
    const loginStatus = document.getElementById("login-status");
    const chatPanel = document.getElementById("chat-panel");
    const chatLog = document.getElementById("chat-log");
    const chatForm = document.getElementById("query-form");
    const chatInput = document.getElementById("question");
    const sendBtn = document.getElementById("submit-btn");
    const interruptBtn = document.getElementById("interrupt-btn");
    const sessionMeta = document.getElementById("session-meta");
    const statusEl = document.getElementById("status");
    const errorEl = document.getElementById("error");

    let socket = null;
    let streaming = false;
    let connected = false;
    let assistantEl = null;
    let acceptTokens = false;
    let ignoreNextInterrupted = false;
    let historyApplied = false;
    let reconnectTimer = null;

    function getToken() {
        return sessionStorage.getItem(TOKEN_KEY) || "";
    }

    function authHeaders() {
        return {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json",
        };
    }

    function logKey() {
        return `${LOG_KEY}:${sessionStorage.getItem(SESSION_KEY) || ""}`;
    }

    function persistLog() {
        sessionStorage.setItem(logKey(), chatLog.innerHTML);
    }

    function restoreLog() {
        const html = sessionStorage.getItem(logKey());
        if (html) {
            chatLog.innerHTML = html;
        }
    }

    async function ensureSession() {
        let sessionId = sessionStorage.getItem(SESSION_KEY);
        if (sessionId) {
            return sessionId;
        }
        const response = await fetch("/knowledge/sessions", {
            method: "POST",
            headers: authHeaders(),
        });
        if (response.status === 401) {
            showLogin("Sign in with the backoffice JWT to chat.");
            return "";
        }
        if (!response.ok) {
            throw new Error("Could not open a chat session.");
        }
        const body = await response.json();
        sessionId = body.session_id;
        sessionStorage.setItem(SESSION_KEY, sessionId);
        return sessionId;
    }

    function showError(message) {
        errorEl.textContent = message;
        errorEl.style.display = message ? "block" : "none";
    }

    function showLogin(message) {
        stopReconnect();
        closeSocket();
        sessionStorage.removeItem(TOKEN_KEY);
        loginPanel.hidden = false;
        chatPanel.hidden = true;
        if (message) {
            loginStatus.textContent = message;
        }
    }

    function showChat() {
        loginPanel.hidden = true;
        chatPanel.hidden = false;
        loginStatus.textContent = "";
        restoreLog();
        connect();
    }

    function setConnected(isConnected) {
        connected = isConnected;
        sendBtn.disabled = !isConnected;
        chatInput.disabled = !isConnected;
        if (!isConnected) {
            interruptBtn.disabled = true;
        }
    }

    function setStreaming(isStreaming) {
        streaming = isStreaming;
        interruptBtn.disabled = !isStreaming || !connected;
        sendBtn.textContent = isStreaming ? "Redirect" : "Ask Assistant";
        statusEl.setAttribute("aria-busy", isStreaming ? "true" : "false");
        statusEl.textContent = isStreaming
            ? "Assistant is answering… Interrupt to stop or type a redirect."
            : connected
              ? "Connected. Ask about supplier ordering, waste protocol, loyalty, or allergens."
              : "";
    }

    function appendBubble(role, text) {
        const item = document.createElement("li");
        item.className = `chat-bubble chat-bubble--${role}`;
        const label = document.createElement("div");
        label.className = "chat-role";
        label.textContent = role === "user" ? "You" : "Knowledge assistant";
        const body = document.createElement("div");
        body.className = "chat-content";
        if (role === "assistant") {
            body.setAttribute("aria-live", "assertive");
        }
        body.textContent = text;
        item.appendChild(label);
        item.appendChild(body);
        chatLog.appendChild(item);
        item.scrollIntoView({ block: "end" });
        persistLog();
        return body;
    }

    function startAssistantBubble() {
        assistantEl = appendBubble("assistant", "");
        assistantEl.parentElement.classList.add("is-streaming");
        acceptTokens = true;
        return assistantEl;
    }

    function finishAssistantBubble(status) {
        if (!assistantEl) {
            return;
        }
        const bubble = assistantEl.parentElement;
        bubble.classList.remove("is-streaming");
        if (status === "interrupted") {
            bubble.classList.add("is-interrupted");
            if (!bubble.querySelector(".chat-meta")) {
                const note = document.createElement("div");
                note.className = "chat-meta";
                note.textContent = "Interrupted";
                bubble.appendChild(note);
            }
        }
        assistantEl = null;
        acceptTokens = false;
        persistLog();
    }

    function abortInFlight(content) {
        if (!sendEvent(EVENT_INTERRUPT, content)) {
            return false;
        }
        ignoreNextInterrupted = true;
        acceptTokens = false;
        finishAssistantBubble("interrupted");
        setStreaming(false);
        return true;
    }

    function appendToken(delta) {
        if (!delta || !acceptTokens) {
            return;
        }
        if (!assistantEl) {
            startAssistantBubble();
        }
        assistantEl.append(delta);
        assistantEl.parentElement.scrollIntoView({ block: "end" });
    }

    function renderCheckpoint(messages) {
        chatLog.innerHTML = "";
        assistantEl = null;
        acceptTokens = false;
        for (const row of messages) {
            if (row.role !== "user" && row.role !== "assistant") {
                continue;
            }
            appendBubble(row.role, row.content || "");
        }
        persistLog();
    }

    function handleEvent(payload) {
        const event = payload.event;
        if (event === EVENT_SESSION) {
            sessionMeta.textContent = `${payload.session_id} · ${payload.thread_id} · ${payload.agent_id} · ${payload.company} · ${payload.status}`;
            setStreaming(payload.status === "streaming");
            if (!historyApplied && Array.isArray(payload.messages)) {
                historyApplied = true;
                if (payload.messages.length) {
                    renderCheckpoint(payload.messages);
                }
            }
            if (payload.status === "streaming" && !assistantEl) {
                startAssistantBubble();
            }
            return;
        }
        if (event === EVENT_TOKEN) {
            appendToken(payload.delta);
            return;
        }
        if (event === EVENT_ASSISTANT_MESSAGE) {
            if (payload.status === "interrupted") {
                if (ignoreNextInterrupted) {
                    ignoreNextInterrupted = false;
                    return;
                }
                finishAssistantBubble("interrupted");
                setStreaming(false);
                return;
            }
            if (!assistantEl) {
                startAssistantBubble();
                if (payload.content) {
                    assistantEl.append(payload.content);
                }
            }
            finishAssistantBubble(payload.status);
            setStreaming(false);
            persistLog();
            return;
        }
        if (event === EVENT_ERROR) {
            showError(payload.detail || "Chat error");
            setStreaming(false);
        }
    }

    function stopReconnect() {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
    }

    function closeSocket() {
        if (!socket) {
            return;
        }
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
            socket.close();
        }
        socket = null;
        setConnected(false);
    }

    async function connect() {
        const token = getToken();
        if (!token) {
            showLogin("Sign in with the backoffice JWT to chat.");
            return;
        }
        stopReconnect();
        closeSocket();
        historyApplied = false;
        setConnected(false);
        sessionMeta.textContent = "Connecting…";
        let sessionId;
        try {
            sessionId = await ensureSession();
        } catch (error) {
            showError(error.message || "Could not open a chat session.");
            return;
        }
        if (!sessionId) {
            return;
        }
        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        const url = `${protocol}://${window.location.host}/knowledge/ws?token=${encodeURIComponent(token)}&session_id=${encodeURIComponent(sessionId)}`;
        socket = new WebSocket(url);
        socket.onopen = () => {
            setConnected(true);
            showError("");
            statusEl.textContent = "Connected. Ask about supplier ordering, waste protocol, loyalty, or allergens.";
        };
        socket.onmessage = (event) => {
            try {
                handleEvent(JSON.parse(event.data));
            } catch (error) {
                console.error(error);
            }
        };
        socket.onclose = (event) => {
            setConnected(false);
            setStreaming(false);
            if (event.code === WS_CLOSE_UNAUTHORIZED) {
                showLogin("Sign in with the same backoffice JWT used by tickets and SSE.");
                return;
            }
            if (event.code === WS_CLOSE_NO_THREAD) {
                sessionStorage.removeItem(SESSION_KEY);
                reconnectTimer = setTimeout(connect, 300);
                return;
            }
            if (!getToken()) {
                return;
            }
            sessionMeta.textContent = "Disconnected. Reconnecting…";
            reconnectTimer = setTimeout(connect, 1500);
        };
        socket.onerror = () => {
            showError("WebSocket connection failed.");
        };
    }

    function sendEvent(event, content) {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            showError("Not connected yet.");
            return false;
        }
        const payload = { event };
        if (content !== undefined) {
            payload.content = content;
        }
        socket.send(JSON.stringify(payload));
        return true;
    }

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        loginStatus.textContent = "Signing in...";
        try {
            const response = await fetch("/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: document.getElementById("login-username").value.trim(),
                    password: document.getElementById("login-password").value,
                }),
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(body.detail || "Sign-in failed");
            }
            sessionStorage.setItem(TOKEN_KEY, body.access_token);
            showChat();
        } catch (error) {
            loginStatus.textContent = error.message || "Sign-in failed";
        }
    });

    chatForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const content = chatInput.value.trim();
        if (!content) {
            return;
        }
        showError("");
        if (streaming) {
            if (!abortInFlight(content)) {
                return;
            }
        } else if (!sendEvent(EVENT_USER_MESSAGE, content)) {
            return;
        }
        appendBubble("user", content);
        chatInput.value = "";
    });

    interruptBtn.addEventListener("click", () => {
        abortInFlight();
    });

    setConnected(false);
    if (getToken()) {
        showChat();
    }
})();
