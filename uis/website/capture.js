(function () {
    function telemetryUrl() {
        if (window.BRASALAND_API) {
            return String(window.BRASALAND_API).replace(/\/$/, "") + "/telemetry/events";
        }
        const host = location.hostname;
        if (host === "localhost" || host === "127.0.0.1") {
            return location.origin + "/telemetry/events";
        }
        return null;
    }

    function send(eventType, tags) {
        const url = telemetryUrl();
        if (!url) {
            return;
        }
        const body = JSON.stringify({ event_type: eventType, tags: tags || {} });
        if (navigator.sendBeacon) {
            const blob = new Blob([body], { type: "application/json" });
            navigator.sendBeacon(url, blob);
            return;
        }
        fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: body,
            keepalive: true,
        }).catch(function () {});
    }

    const page = location.pathname.split("/").pop() || "index.html";
    send("page_view", {
        path: location.pathname,
        page: page,
        surface: "public_website",
    });

    const nav = document.getElementById("primary-nav");
    if (nav) {
        nav.addEventListener("click", function (event) {
            const link = event.target.closest("a[href]");
            if (!link) {
                return;
            }
            send("section_navigation", {
                href: link.getAttribute("href"),
                label: (link.textContent || "").trim(),
                surface: "public_website",
            });
        });
    }
})();
