(function (global) {
    "use strict";

    const LOCAL_KEY = "ways-to-saved-draws";

    function getConfig() {
        const c = global.WAYS_TO_SAVE_CONFIG || {};
        const url = (c.supabaseUrl || "").trim();
        const key = (c.supabaseAnonKey || "").trim();
        const table = (c.supabaseTable || "saved_draws").trim() || "saved_draws";
        return { url, key, table };
    }

    function isSupabaseConfigured() {
        const { url, key } = getConfig();
        return Boolean(url && key);
    }

    function slugSource(source) {
        const s = String(source || "unknown")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "unknown";
        return s.slice(0, 24);
    }
    
    function newSaveCode(source) {
        const d = new Date();
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const h = String(d.getHours()).padStart(2, "0");
        const mi = String(d.getMinutes()).padStart(2, "0");
        const s = String(d.getSeconds()).padStart(2, "0");
        const date = y + mo + day;
        const time = h + mi + s;
        const tail = Math.random().toString(36).slice(2, 6).toUpperCase();
        return "WT-" + date + "-" + time + "-" + slugSource(source) + "-" + tail;
    }

    function cardText(value) {
        if (value == null) return "";
        if (typeof value === "string") return value;
        if (typeof value === "object" && value.text != null) return String(value.text);
        return String(value);
    }

    function flattenCards(cards) {
        const c = cards || {};
        return {
            ways_to: cardText(c.waysTo),
            user_persona: cardText(c.users),
            design_limit: cardText(c.designLimit),
            audience_limit: cardText(c.audienceLimit),
            constraints_plus: c.constraintsPlus != null ? cardText(c.constraintsPlus) : null,
        };
    }

    function appendLocalRecord(record) {
        let list = [];
        try {
            const raw = global.localStorage.getItem(LOCAL_KEY);
            list = raw ? JSON.parse(raw) : [];
        } catch (_) {
            list = [];
        }
        if (!Array.isArray(list)) list = [];
        list.push(record);
        global.localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
    }

    function buildSupabaseRow(payload, meta) {
        const flat = flattenCards(payload.cards);
        const constraintsPlus =
            typeof payload.constraintsPlusOn === "boolean"
                ? payload.constraintsPlusOn
                : typeof payload.chaosIncluded === "boolean"
                  ? payload.chaosIncluded
                  : null;
        
        return {
            save_code: meta.saveCode,
            saved_at: payload.savedAt,
            source: meta.source || "unknown",
            ways_to: flat.ways_to || "[empty]",
            user_persona: flat.user_persona || "[empty]",
            design_limit: flat.design_limit || "[empty]",
            audience_limit: flat.audience_limit || "[empty]",
            constraints_plus: flat.constraints_plus,
            constraints_plus_on: constraintsPlus,
            ideation_note: payload.note || "", // Added payload note here
        };
    }

    function postToSupabase(row) {
        const { url, key, table } = getConfig();
        const base = url.replace(/\/+$/, "");
        const endpoint = base + "/rest/v1/" + encodeURIComponent(table);

        return global.fetch(endpoint, {
            method: "POST",
            headers: {
                apikey: key,
                Authorization: "Bearer " + key,
                "Content-Type": "application/json",
                Prefer: "return=minimal",
            },
            body: JSON.stringify(row),
        }).then((res) => {
            if (!res.ok) {
                return res.text().then((t) => {
                    throw new Error(t || res.statusText || "Supabase insert failed");
                });
            }
        });
    }

    global.saveWaysToDraw = function (payload, meta) {
        const saveCode = newSaveCode((meta && meta.source) || "unknown");
        const source = (meta && meta.source) || "unknown";

        const record = Object.assign({}, payload, {
            saveCode: saveCode,
            source: source,
            localSavedAt: new Date().toISOString(),
        });

        appendLocalRecord(record);

        if (!isSupabaseConfigured()) {
            return Promise.resolve({
                ok: true,
                local: true,
                remote: false,
                saveCode: saveCode,
                remoteSkipped: "supabase_not_configured",
            });
        }

        const row = buildSupabaseRow(payload, { source: source, saveCode: saveCode });

        return postToSupabase(row)
            .then(() => ({
                ok: true,
                local: true,
                remote: true,
                saveCode: saveCode,
            }))
            .catch((err) => ({
                ok: true,
                local: true,
                remote: false,
                saveCode: saveCode,
                remoteError: err && err.message ? err.message : String(err),
            }));
    };

    global.saveWaysToDraw._localStorageKey = LOCAL_KEY;
})(typeof window !== "undefined" ? window : globalThis);