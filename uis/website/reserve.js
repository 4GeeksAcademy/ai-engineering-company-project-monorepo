(function () {
    const LOCATIONS = {
        "miami-downtown": "USD",
        "bogota-norte": "COP",
        "COL-01": "COP",
        "COL-02": "COP",
        "COL-03": "COP",
        "COL-04": "COP",
        "COL-05": "COP",
        "COL-06": "COP",
        "COL-07": "COP",
        "COL-08": "COP",
        "COL-09": "COP",
        "COL-10": "COP",
    };
    const STORAGE_KEY = "brasaland-table-request";

    function tr(key) {
        return (window.BrasalandLang && window.BrasalandLang.t(key)) || "";
    }

    function parseLocation(text) {
        const raw = String(text || "").trim();
        const lower = raw.toLowerCase();
        if (LOCATIONS[raw]) {
            return raw;
        }
        if (LOCATIONS[lower]) {
            return lower;
        }
        const col = raw.toUpperCase().match(/^COL-?(\d{1,2})$/);
        if (col) {
            const id = "COL-" + String(col[1]).padStart(2, "0");
            if (LOCATIONS[id]) {
                return id;
            }
        }
        if (lower.indexOf("miami") !== -1 || lower.indexOf("florida") !== -1) {
            return "miami-downtown";
        }
        if (lower.indexOf("bogota") !== -1 || lower.indexOf("bogotá") !== -1) {
            return "bogota-norte";
        }
        return "";
    }

    function parseParty(text) {
        const match = String(text || "").match(/\d+/);
        if (!match) {
            return 0;
        }
        const n = Number(match[0]);
        return n > 0 ? n : 0;
    }

    function parseDate(text) {
        const match = String(text || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) {
            return "";
        }
        const y = Number(match[1]);
        const m = Number(match[2]);
        const d = Number(match[3]);
        const dt = new Date(Date.UTC(y, m - 1, d));
        if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
            return "";
        }
        return match[0];
    }

    function parseTime(text) {
        const match = String(text || "").trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
        if (!match) {
            return "";
        }
        return match[1].padStart(2, "0") + ":" + match[2];
    }

    function fill(template, fields) {
        return template.replace(/\{(\w+)\}/g, function (_, name) {
            return fields[name] == null ? "" : String(fields[name]);
        });
    }

    const state = {
        step: "location",
        location: "",
        party: 0,
        date: "",
        time: "",
        name: "",
    };

    function addMsg(role, text) {
        const log = document.getElementById("reserve-log");
        if (!log) {
            return;
        }
        const p = document.createElement("p");
        p.className = "reserve-msg reserve-msg-" + role;
        p.textContent = text;
        log.appendChild(p);
        log.scrollTop = log.scrollHeight;
    }

    function showChips(on) {
        const chips = document.getElementById("reserve-chips");
        if (chips) {
            chips.hidden = !on;
        }
    }

    function labelChrome() {
        const open = document.getElementById("reserve-open");
        const title = document.getElementById("reserve-title");
        const close = document.getElementById("reserve-close");
        const send = document.getElementById("reserve-send");
        const reset = document.getElementById("reserve-reset");
        const input = document.getElementById("reserve-input");
        if (open) {
            open.textContent = tr("bot.open");
        }
        if (title) {
            title.textContent = tr("bot.title");
        }
        if (close) {
            close.textContent = tr("bot.close");
        }
        if (send) {
            send.textContent = tr("bot.send");
        }
        if (reset) {
            reset.textContent = tr("bot.reset");
        }
        if (input) {
            input.placeholder = tr("bot.placeholder");
        }
        const miami = document.getElementById("reserve-chip-miami");
        const bogota = document.getElementById("reserve-chip-bogota");
        const col = document.getElementById("reserve-chip-col");
        if (miami) {
            miami.textContent = tr("bot.chip.miami");
        }
        if (bogota) {
            bogota.textContent = tr("bot.chip.bogota");
        }
        if (col) {
            col.textContent = tr("bot.chip.col");
        }
    }

    function startChat() {
        const log = document.getElementById("reserve-log");
        if (log) {
            log.innerHTML = "";
        }
        state.step = "location";
        state.location = "";
        state.party = 0;
        state.date = "";
        state.time = "";
        state.name = "";
        addMsg("bot", tr("bot.hello"));
        addMsg("bot", tr("bot.ask.location"));
        showChips(true);
    }

    function finish() {
        const currency = LOCATIONS[state.location] || "";
        const summary = fill(tr("bot.summary"), {
            location: state.location,
            currency: currency,
            party: state.party,
            date: state.date,
            time: state.time,
            name: state.name,
        });
        addMsg("bot", summary);
        addMsg("bot", tr("bot.saved"));
        state.step = "done";
        showChips(false);
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    location_id: state.location,
                    currency: currency,
                    party: state.party,
                    date: state.date,
                    time: state.time,
                    name: state.name,
                    saved_at: new Date().toISOString(),
                    confirmed: false,
                })
            );
        } catch (error) {
            /* ignore */
        }
    }

    function handle(text) {
        const value = String(text || "").trim();
        if (!value || state.step === "done") {
            return;
        }
        addMsg("user", value);
        if (state.step === "location") {
            const loc = parseLocation(value);
            if (!loc) {
                addMsg("bot", tr("bot.bad.location"));
                return;
            }
            state.location = loc;
            state.step = "party";
            showChips(false);
            addMsg("bot", tr("bot.ask.party"));
            return;
        }
        if (state.step === "party") {
            const n = parseParty(value);
            if (!n) {
                addMsg("bot", tr("bot.bad.party"));
                return;
            }
            state.party = n;
            state.step = "date";
            addMsg("bot", tr("bot.ask.date"));
            return;
        }
        if (state.step === "date") {
            const date = parseDate(value);
            if (!date) {
                addMsg("bot", tr("bot.bad.date"));
                return;
            }
            state.date = date;
            state.step = "time";
            addMsg("bot", tr("bot.ask.time"));
            return;
        }
        if (state.step === "time") {
            const time = parseTime(value);
            if (!time) {
                addMsg("bot", tr("bot.bad.time"));
                return;
            }
            state.time = time;
            state.step = "name";
            addMsg("bot", tr("bot.ask.name"));
            return;
        }
        if (state.step === "name") {
            if (value.length < 2) {
                addMsg("bot", tr("bot.bad.name"));
                return;
            }
            state.name = value;
            finish();
        }
    }

    function mount() {
        if (document.getElementById("reserve-root")) {
            return;
        }
        const root = document.createElement("div");
        root.id = "reserve-root";
        root.innerHTML =
            '<button type="button" class="reserve-open" id="reserve-open"></button>' +
            '<div class="reserve-panel" id="reserve-panel" hidden>' +
            '<div class="reserve-head">' +
            '<strong id="reserve-title"></strong>' +
            '<button type="button" class="reserve-x" id="reserve-close"></button>' +
            "</div>" +
            '<div class="reserve-log" id="reserve-log"></div>' +
            '<div class="reserve-chips" id="reserve-chips">' +
            '<button type="button" id="reserve-chip-miami"></button>' +
            '<button type="button" id="reserve-chip-bogota"></button>' +
            '<button type="button" id="reserve-chip-col"></button>' +
            "</div>" +
            '<form class="reserve-form" id="reserve-form">' +
            '<input id="reserve-input" autocomplete="off" />' +
            '<button type="submit" id="reserve-send"></button>' +
            "</form>" +
            '<button type="button" class="reserve-reset" id="reserve-reset"></button>' +
            "</div>";
        document.body.appendChild(root);
        labelChrome();

        const panel = document.getElementById("reserve-panel");
        const open = document.getElementById("reserve-open");
        const form = document.getElementById("reserve-form");
        const input = document.getElementById("reserve-input");

        open.addEventListener("click", function () {
            const show = panel.hasAttribute("hidden");
            if (show) {
                panel.removeAttribute("hidden");
                if (!document.getElementById("reserve-log").childElementCount) {
                    startChat();
                }
                input.focus();
            } else {
                panel.setAttribute("hidden", "");
            }
        });
        document.getElementById("reserve-close").addEventListener("click", function () {
            panel.setAttribute("hidden", "");
        });
        document.getElementById("reserve-reset").addEventListener("click", startChat);
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            const text = input.value;
            input.value = "";
            handle(text);
        });
        document.getElementById("reserve-chip-miami").addEventListener("click", function () {
            handle("miami-downtown");
        });
        document.getElementById("reserve-chip-bogota").addEventListener("click", function () {
            handle("bogota-norte");
        });
        document.getElementById("reserve-chip-col").addEventListener("click", function () {
            handle("COL-01");
        });
        document.addEventListener("brasaland-lang", labelChrome);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mount);
    } else {
        mount();
    }
})();
