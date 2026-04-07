(function () {
    "use strict";

    const CARD_HEIGHT = 132;
    const COPIES = 14;
    const MID_COPY = 6;
    const LEVER_MAX = 58;
    const LEVER_TRIGGER = 36;
    const deckData = globalThis.WAYSTO_DECKS || {};

    const decks = [
        { id: "waysTo", label: "Ways To", values: deckData.waysTo || placeholders("Ways To") },
        { id: "users", label: "Users", values: deckData.users || placeholders("User") },
        { id: "designLimit", label: "Design limit", values: deckData.designLimit || placeholders("Design limit") },
        { id: "audienceLimit", label: "Audience limit", values: deckData.audienceLimit || placeholders("Audience limit") },
        { id: "constraintsPlus", label: "Constraints+", values: deckData.constraintsPlus || placeholders("Constraint+") },
    ];

    const state = {
        wheels: [],
        spinning: false,
        showExtra: true,
    };

    const els = {
        wheels: document.getElementById("wheels"),
        extraToggle: document.getElementById("extraToggle"),
        lever: document.getElementById("lever"),
        spinButton: document.getElementById("spinButton"),
        saveButton: document.getElementById("saveButton"),
        saveMessage: document.getElementById("saveMessage"),
    };

    function placeholders(prefix) {
        const list = [];
        for (let i = 1; i <= 24; i++) {
            list.push(prefix + " " + String(i).padStart(2, "0"));
        }
        return list;
    }

    function buildWheels() {
        els.wheels.innerHTML = "";
        state.wheels = [];

        decks.forEach((deck, index) => {
            const wheelEl = document.createElement("article");
            wheelEl.className = "wheel";
            if (deck.id === "constraintsPlus" && !state.showExtra) {
                wheelEl.classList.add("hidden");
            }

            const direction = index % 2 === 0 ? 1 : -1;
            wheelEl.innerHTML = `
                <h2 class="wheel-title">${deck.label}</h2>
                <div class="window"><div class="strip"></div></div>
                <button class="lock" type="button">Unlock</button>
            `;

            const strip = wheelEl.querySelector(".strip");
            for (let c = 0; c < COPIES; c++) {
                deck.values.forEach((value) => {
                    const card = document.createElement("div");
                    card.className = "card";
                    card.innerHTML = `<div class="card-box">${value}</div>`;
                    strip.appendChild(card);
                });
            }

            const len = deck.values.length;
            const currentIndex = Math.floor(Math.random() * len);
            const slot = MID_COPY * len + currentIndex;
            strip.style.transform = `translateY(${-slot * CARD_HEIGHT}px)`;

            const lock = wheelEl.querySelector(".lock");
            lock.addEventListener("click", () => toggleLock(index));

            els.wheels.appendChild(wheelEl);
            state.wheels.push({
                deck,
                index,
                direction,
                wheelEl,
                strip,
                lock,
                locked: false,
                currentIndex,
            });
        });
    }

    function toggleLock(index) {
        const wheel = state.wheels[index];
        if (!wheel || isHidden(wheel)) return;
        wheel.locked = !wheel.locked;
        wheel.lock.textContent = wheel.locked ? "Locked" : "Unlock";
        wheel.lock.classList.toggle("active", wheel.locked);
    }

    function isHidden(wheel) {
        return wheel.deck.id === "constraintsPlus" && !state.showExtra;
    }

    function spinAll() {
        if (state.spinning) return;
        const tasks = [];
        state.wheels.forEach((wheel) => {
            if (isHidden(wheel) || wheel.locked) return;
            tasks.push(spinWheel(wheel));
        });
        if (!tasks.length) return;

        state.spinning = true;
        setDisabled(true);
        Promise.all(tasks).finally(() => {
            state.spinning = false;
            setDisabled(false);
        });
    }

    function spinWheel(wheel) {
        const len = wheel.deck.values.length;
        const start = wheel.currentIndex;
        let end = Math.floor(Math.random() * len);
        if (end === start) end = (end + 1) % len;

        const turns = 3 + Math.floor(Math.random() * 3);
        const directionalDelta = wheel.direction === 1
            ? (end - start + len) % len
            : (start - end + len) % len;
        const travel = wheel.direction * (turns * len + directionalDelta);

        const startSlot = MID_COPY * len + start;
        const endSlot = startSlot + travel;
        const ms = 1700 + Math.floor(Math.random() * 900);

        wheel.strip.style.transition = "none";
        wheel.strip.style.transform = `translateY(${-startSlot * CARD_HEIGHT}px)`;

        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                wheel.strip.style.transition = `transform ${ms}ms cubic-bezier(0.22, 0.85, 0.2, 1)`;
                wheel.strip.style.transform = `translateY(${-endSlot * CARD_HEIGHT}px)`;
                window.setTimeout(() => {
                    wheel.strip.style.transition = "none";
                    wheel.currentIndex = end;
                    const restSlot = MID_COPY * len + end;
                    wheel.strip.style.transform = `translateY(${-restSlot * CARD_HEIGHT}px)`;
                    resolve();
                }, ms + 120);
            });
        });
    }

    function setDisabled(disabled) {
        els.spinButton.disabled = disabled;
    }

    function saveCards() {
        const payload = {
            savedAt: new Date().toISOString(),
            cards: {},
            constraintsPlusOn: state.showExtra,
        };

        state.wheels.forEach((wheel) => {
            if (isHidden(wheel)) return;
            payload.cards[wheel.deck.id] = wheel.deck.values[wheel.currentIndex];
        });

        els.saveMessage.textContent = "Saving...";
        const saver = globalThis.saveWaysToDraw;
        if (typeof saver !== "function") {
            els.saveMessage.textContent = "Save module missing; include save-draws.js.";
            return;
        }

        saver(payload, { source: "variation" }).then((result) => {
            const id = result.saveCode ? " Save ID: " + result.saveCode + "." : "";
            if (result.remote) {
                els.saveMessage.textContent = "Saved on this device and in Supabase." + id;
            } else if (result.remoteSkipped === "supabase_not_configured") {
                els.saveMessage.textContent = "Saved on this device." + id + " Add Supabase in supabase-config.js to sync.";
            } else {
                els.saveMessage.textContent = "Saved on this device." + id + " Could not sync to Supabase.";
            }
        });
    }

    let dragging = false;
    let startY = 0;
    let leverAngle = 0;

    function setLeverAngle(angle) {
        leverAngle = Math.max(0, Math.min(LEVER_MAX, angle));
        els.lever.style.transform = `rotate(${leverAngle}deg)`;
        const value = Math.round((leverAngle / LEVER_MAX) * 100);
        els.lever.setAttribute("aria-valuenow", String(value));
    }

    function onLeverDown(event) {
        if (state.spinning) return;
        dragging = true;
        startY = event.clientY;
        els.lever.setPointerCapture(event.pointerId);
    }

    function onLeverMove(event) {
        if (!dragging || state.spinning) return;
        const dy = event.clientY - startY;
        setLeverAngle(dy * 0.9);
    }

    function onLeverUp(event) {
        if (!dragging) return;
        dragging = false;
        try {
            els.lever.releasePointerCapture(event.pointerId);
        } catch (err) {
            // Ignore release issues when capture was lost.
        }
        if (leverAngle >= LEVER_TRIGGER) spinAll();
        setLeverAngle(0);
    }

    function onToggleExtra() {
        state.showExtra = els.extraToggle.checked;
        const extra = state.wheels.find((w) => w.deck.id === "constraintsPlus");
        if (!extra) return;
        extra.wheelEl.classList.toggle("hidden", !state.showExtra);
    }

    els.extraToggle.addEventListener("change", onToggleExtra);
    els.spinButton.addEventListener("click", spinAll);
    els.saveButton.addEventListener("click", saveCards);
    els.lever.addEventListener("pointerdown", onLeverDown);
    els.lever.addEventListener("pointermove", onLeverMove);
    els.lever.addEventListener("pointerup", onLeverUp);
    els.lever.addEventListener("pointercancel", onLeverUp);
    els.lever.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            spinAll();
        }
    });

    buildWheels();
})();
