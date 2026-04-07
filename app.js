(function () {
    "use strict";

    const CARD_HEIGHT = 140;
    const PLACEHOLDER_COUNT = 24;
    /** Repeated deck tiles so long spins stay inside the strip. */
    const STRIP_COPIES = 20;
    /** Resting position lives in this copy block (middle of the strip). */
    const STRIP_MID = 8;
    const MIN_SPINS = 3;
    const MAX_SPINS = 6;
    const LEVER_MAX = 58;
    const LEVER_THRESHOLD = 38;
    const deckData = globalThis.WAYSTO_DECKS || {};

    const DECKS = [
        { id: "waysTo", label: "Ways To", placeholders: deckData.waysTo || makePlaceholders("Ways To") },
        { id: "users", label: "Users", placeholders: deckData.users || makePlaceholders("User") },
        { id: "designLimit", label: "Design limit", placeholders: deckData.designLimit || makePlaceholders("Design") },
        { id: "audienceLimit", label: "Audience limit", placeholders: deckData.audienceLimit || makePlaceholders("Audience") },
        { id: "constraintsPlus", label: "Constraints+", placeholders: deckData.constraintsPlus || makePlaceholders("Chaos") },
    ];

    function makePlaceholders(prefix) {
        const out = [];
        for (let i = 1; i <= PLACEHOLDER_COUNT; i++) {
            out.push(`${prefix} ${String(i).padStart(2, "0")}`);
        }
        return out;
    }

    const state = {
        wheels: [],
        spinning: false,
        chaosVisible: true,
    };

    const els = {
        wheels: document.getElementById("wheels"),
        chaosToggle: document.getElementById("chaosToggle"),
        leverArm: document.getElementById("leverArm"),
        leverPivot: document.getElementById("leverPivot"),
        spinBtn: document.getElementById("spinBtn"),
        saveBtn: document.getElementById("saveBtn"),
        saveStatus: document.getElementById("saveStatus"),
    };

    function buildWheels() {
        els.wheels.innerHTML = "";
        state.wheels = [];

        DECKS.forEach((deck, index) => {
            const flip = index % 2 === 1;
            const wheel = document.createElement("div");
            wheel.className = "wheel";
            wheel.dataset.deckId = deck.id;
            wheel.dataset.index = String(index);
            if (deck.id === "constraintsPlus") {
                wheel.dataset.chaos = "true";
                wheel.dataset.hidden = state.chaosVisible ? "false" : "true";
            }

            wheel.innerHTML = `
                <div class="wheel__label">${escapeHtml(deck.label)}</div>
                <div class="wheel__window" aria-hidden="true">
                    <div class="wheel__strip-wrap">
                        <div class="wheel__strip ${flip ? "wheel__strip--flip" : ""}" data-strip></div>
                    </div>
                </div>
                <button type="button" class="wheel__lock" aria-pressed="false" aria-label="Lock ${escapeAttr(deck.label)}">
                    <span class="wheel__lock-icon" aria-hidden="true">🔓</span>
                    <span>Lock</span>
                </button>
            `;

            const strip = wheel.querySelector("[data-strip]");
            for (let c = 0; c < STRIP_COPIES; c++) {
                deck.placeholders.forEach((text) => {
                    const card = document.createElement("div");
                    card.className = "wheel__card";
                    card.innerHTML = `<div class="wheel__card-inner">${escapeHtml(text)}</div>`;
                    strip.appendChild(card);
                });
            }

            const lockBtn = wheel.querySelector(".wheel__lock");
            lockBtn.addEventListener("click", () => toggleLock(index));

            els.wheels.appendChild(wheel);

            const len = deck.placeholders.length;
            const startIndex = Math.floor(Math.random() * len);
            const slotIndex = STRIP_MID * len + startIndex;
            strip.style.transform = translateSlot(slotIndex);

            state.wheels.push({
                deck,
                index,
                strip,
                lockBtn,
                locked: false,
                currentIndex: startIndex,
                slotIndex,
                flip,
            });
        });
    }

    function translateSlot(slot) {
        return `translateY(${-slot * CARD_HEIGHT}px)`;
    }

    function escapeHtml(s) {
        const d = document.createElement("div");
        d.textContent = s;
        return d.innerHTML;
    }

    function escapeAttr(s) {
        return String(s).replace(/"/g, "&quot;");
    }

    function toggleLock(wheelIndex) {
        const w = state.wheels[wheelIndex];
        if (isWheelHidden(w)) return;
        w.locked = !w.locked;
        w.lockBtn.setAttribute("aria-pressed", w.locked ? "true" : "false");
        const icon = w.lockBtn.querySelector(".wheel__lock-icon");
        icon.textContent = w.locked ? "🔒" : "🔓";
    }

    function isWheelHidden(w) {
        if (w.deck.id !== "constraintsPlus") return false;
        return !state.chaosVisible;
    }

    function getStripLength(w) {
        return w.deck.placeholders.length;
    }

    function spinWheel(w, rng) {
        const len = getStripLength(w);
        if (len <= 1) return Promise.resolve();

        const start = w.currentIndex;
        let end = Math.floor(rng() * len);
        if (end === start && len > 1) {
            end = (end + 1 + Math.floor(rng() * (len - 1))) % len;
        }

        let spins = MIN_SPINS + Math.floor(rng() * (MAX_SPINS - MIN_SPINS + 1));
        const delta = (end - start + len) % len;
        const totalSlots = STRIP_COPIES * len;
        let slotStart = STRIP_MID * len + start;
        let slotEnd = slotStart + spins * len + delta;

        while (slotEnd >= totalSlots - len && spins > MIN_SPINS) {
            spins -= 1;
            slotEnd = slotStart + spins * len + delta;
        }
        if (slotEnd >= totalSlots) {
            slotEnd = slotStart + MIN_SPINS * len + delta;
        }

        w.strip.style.transition = "none";
        w.strip.style.transform = translateSlot(slotStart);

        const endY = -slotEnd * CARD_HEIGHT;

        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const ms = 2200 + Math.floor(rng() * 900);
                    w.strip.style.transition = `transform ${ms}ms cubic-bezier(0.2, 0.85, 0.25, 1)`;
                    w.strip.style.transform = `translateY(${endY}px)`;
                    const done = () => {
                        w.strip.removeEventListener("transitionend", done);
                        w.strip.style.transition = "none";
                        w.currentIndex = end;
                        w.slotIndex = STRIP_MID * len + end;
                        w.strip.style.transform = translateSlot(w.slotIndex);
                        resolve();
                    };
                    w.strip.addEventListener("transitionend", done, { once: true });
                    window.setTimeout(done, ms + 150);
                });
            });
        });
    }

    function spinAll() {
        if (state.spinning) return;
        const rng = Math.random;
        const tasks = [];
        for (const w of state.wheels) {
            if (isWheelHidden(w)) continue;
            if (w.locked) continue;
            tasks.push(spinWheel(w, rng));
        }
        if (tasks.length === 0) return;

        state.spinning = true;
        setControlsDisabled(true);
        Promise.all(tasks).then(() => {
            state.spinning = false;
            setControlsDisabled(false);
        });
    }

    function setControlsDisabled(disabled) {
        els.spinBtn.disabled = disabled;
        els.leverArm.classList.toggle("spinning", disabled);
    }

    function onChaosToggle() {
        state.chaosVisible = els.chaosToggle.checked;
        const chaosWheel = state.wheels.find((w) => w.deck.id === "constraintsPlus");
        if (!chaosWheel) return;
        const el = chaosWheel.strip.closest(".wheel");
        el.dataset.hidden = state.chaosVisible ? "false" : "true";
    }

    let leverDragging = false;
    let leverStartY = 0;
    let leverCurrent = 0;

    function setLeverAngle(deg) {
        leverCurrent = Math.max(0, Math.min(LEVER_MAX, deg));
        els.leverArm.style.transform = `rotate(${leverCurrent}deg)`;
        els.leverArm.setAttribute("aria-valuenow", String(Math.round((leverCurrent / LEVER_MAX) * 100)));
    }

    function resetLever() {
        setLeverAngle(0);
    }

    function onLeverPointerDown(e) {
        if (state.spinning) return;
        leverDragging = true;
        leverStartY = e.clientY;
        els.leverArm.setPointerCapture(e.pointerId);
    }

    function onLeverPointerMove(e) {
        if (!leverDragging || state.spinning) return;
        const dy = e.clientY - leverStartY;
        const angle = Math.max(0, Math.min(LEVER_MAX, dy * 0.85));
        setLeverAngle(angle);
    }

    function onLeverPointerUp(e) {
        if (!leverDragging) return;
        leverDragging = false;
        try {
            els.leverArm.releasePointerCapture(e.pointerId);
        } catch (_) {}
        if (leverCurrent >= LEVER_THRESHOLD) {
            spinAll();
        }
        resetLever();
    }

    function saveDraw() {
        const payload = {
            savedAt: new Date().toISOString(),
            chaosIncluded: state.chaosVisible,
            cards: {},
        };

        for (const w of state.wheels) {
            if (isWheelHidden(w)) continue;
            const label = w.deck.label;
            const text = w.deck.placeholders[w.currentIndex];
            payload.cards[w.deck.id] = { label, text };
        }

        els.saveStatus.textContent = "Saving…";
        els.saveStatus.classList.remove("save-status--ok", "save-status--err");

        const saver = globalThis.saveWaysToDraw;
        if (typeof saver !== "function") {
            els.saveStatus.textContent = "Save module missing; include save-draws.js before app.js.";
            els.saveStatus.classList.add("save-status--err");
            return;
        }

        saver(payload, { source: "main" }).then((result) => {
            const id = result.saveCode ? " Save ID: " + result.saveCode + "." : "";
            if (result.remote) {
                els.saveStatus.textContent = "Saved on this device and in Supabase." + id;
            } else if (result.remoteSkipped === "supabase_not_configured") {
                els.saveStatus.textContent = "Saved on this device." + id + " Add Supabase URL/key in supabase-config.js to sync.";
            } else {
                els.saveStatus.textContent = "Saved on this device." + id + " Could not sync to Supabase—try again later.";
            }
            els.saveStatus.classList.add("save-status--ok");
        });
    }

    els.chaosToggle.addEventListener("change", onChaosToggle);
    els.spinBtn.addEventListener("click", () => spinAll());

    els.leverArm.addEventListener("pointerdown", onLeverPointerDown);
    els.leverArm.addEventListener("pointermove", onLeverPointerMove);
    els.leverArm.addEventListener("pointerup", onLeverPointerUp);
    els.leverArm.addEventListener("pointercancel", onLeverPointerUp);

    els.leverArm.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            spinAll();
        }
    });

    els.saveBtn.addEventListener("click", saveDraw);

    buildWheels();
    onChaosToggle();
})();
