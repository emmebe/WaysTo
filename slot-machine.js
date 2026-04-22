(function () {
    "use strict";

    let CARD_HEIGHT = 138;
    const COPIES = 12;
    const MID_COPY = 5;
    const LEVER_MAX = 62;
    const LEVER_TRIGGER = 40;
    const deckData = globalThis.WAYSTO_DECKS || {};

    function updateCardHeight() {
        setTimeout(() => {
            const sampleCard = document.querySelector('.card');
            if (sampleCard) {
                const newHeight = sampleCard.offsetHeight;
                if (newHeight > 0 && Math.abs(newHeight - CARD_HEIGHT) > 1) {
                    CARD_HEIGHT = newHeight;
                    state.reels.forEach(reel => {
                        if (reel.strip) {
                            const len = reel.deck.values.length;
                            const slot = MID_COPY * len + reel.currentIndex;
                            reel.strip.style.transform = `translateY(${-slot * CARD_HEIGHT}px)`;
                        }
                    });
                }
            }
        }, 100);
    }

    const decks = [
        { id: "waysTo", label: "Ways To", values: deckData.waysTo || placeholderCards("Ways To") },
        { id: "users", label: "Users", values: deckData.users || placeholderCards("User") },
        { id: "designLimit", label: "Design limit", values: deckData.designLimit || placeholderCards("Design limit") },
        { id: "audienceLimit", label: "Audience limit", values: deckData.audienceLimit || placeholderCards("Audience limit") },
        { id: "constraintsPlus", label: "Constraints+", values: deckData.constraintsPlus || placeholderCards("Constraint+") },
    ];

    const state = {
        reels: [],
        spinning: false,
        showConstraintsPlus: true,
    };

    const els = {
        reelBank: document.getElementById("reelBank"),
        constraintsPlusToggle: document.getElementById("constraintsPlusToggle"),
        lever: document.getElementById("lever"),
        spinButton: document.getElementById("spinButton"),
        saveButton: document.getElementById("saveButton"),
        saveStatus: document.getElementById("saveStatus"),
        ideationNote: document.getElementById("ideationNote"),
        charCount: document.getElementById("charCount"),
    };

    function placeholderCards(prefix) {
        const result = [];
        for (let i = 1; i <= 24; i++) {
            result.push(prefix + " placeholder " + String(i).padStart(2, "0"));
        }
        return result;
    }

    function buildReels() {
        els.reelBank.innerHTML = "";
        state.reels = [];

        decks.forEach((deck, index) => {
            const reel = document.createElement("article");
            reel.className = "reel";
            if (deck.id === "constraintsPlus" && !state.showConstraintsPlus) {
                reel.classList.add("hidden");
            }

            const direction = index % 2 === 0 ? 1 : -1;
            reel.innerHTML = `
                <h2 class="reel-title">${deck.label}</h2>
                <div class="window initial">
                    <div class="strip"></div>
                </div>
                <button type="button" class="lock-btn">Unlocked</button>
            `;

            const strip = reel.querySelector(".strip");
            for (let c = 0; c < COPIES; c++) {
                deck.values.forEach((value) => {
                    const card = document.createElement("div");
                    card.className = "card";
                    card.innerHTML = `<div class="card-placeholder">${value}</div>`;
                    strip.appendChild(card);
                });
            }

            const len = deck.values.length;
            const currentIndex = Math.floor(Math.random() * len);
            const slot = MID_COPY * len + currentIndex;
            strip.style.transform = `translateY(${-slot * CARD_HEIGHT}px)`;

            const lockBtn = reel.querySelector(".lock-btn");
            lockBtn.addEventListener("click", () => toggleLock(index));

            els.reelBank.appendChild(reel);
            state.reels.push({
                deck,
                index,
                direction,
                reel,
                strip,
                lockBtn,
                locked: false,
                currentIndex,
            });
        });
    }

    function toggleLock(index) {
        const reel = state.reels[index];
        if (!reel || isHidden(reel)) return;

        reel.locked = !reel.locked;
        reel.lockBtn.textContent = reel.locked ? "Locked" : "Unlocked";
        reel.lockBtn.classList.toggle("active", reel.locked);
    }

    function isHidden(reel) {
        return reel.deck.id === "constraintsPlus" && !state.showConstraintsPlus;
    }

    function spinAll() {
        if (state.spinning) return;

        const activeSpins = [];
        state.reels.forEach((reel) => {
            if (isHidden(reel) || reel.locked) return;
            activeSpins.push(spinReel(reel));
        });

        if (!activeSpins.length) return;

        document.querySelectorAll('.window.initial').forEach(windowEl => windowEl.classList.remove('initial'));

        state.spinning = true;
        setDisabled(true);
        Promise.all(activeSpins).finally(() => {
            state.spinning = false;
            setDisabled(false);
        });
    }

    function spinReel(reel) {
        const len = reel.deck.values.length;
        const start = reel.currentIndex;
        let end = Math.floor(Math.random() * len);
        if (end === start) {
            end = (end + 1) % len;
        }

        const turns = 3 + Math.floor(Math.random() * 3);
        const directionalDelta = reel.direction === 1
            ? (end - start + len) % len
            : (start - end + len) % len;
        const travel = reel.direction * (turns * len + directionalDelta);
        const startSlot = MID_COPY * len + start;
        const endSlot = startSlot + travel;
        const ms = 1800 + Math.floor(Math.random() * 900);

        reel.strip.style.transition = "none";
        reel.strip.style.transform = `translateY(${-startSlot * CARD_HEIGHT}px)`;

        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                reel.strip.style.transition = `transform ${ms}ms cubic-bezier(0.22, 0.85, 0.2, 1)`;
                reel.strip.style.transform = `translateY(${-endSlot * CARD_HEIGHT}px)`;

                window.setTimeout(() => {
                    reel.strip.style.transition = "none";
                    reel.currentIndex = end;
                    const restSlot = MID_COPY * len + end;
                    reel.strip.style.transform = `translateY(${-restSlot * CARD_HEIGHT}px)`;
                    resolve();
                }, ms + 120);
            });
        });
    }

    function setDisabled(disabled) {
        els.spinButton.disabled = disabled;
    }

    function saveSelectedCards() {
        const payload = {
            savedAt: new Date().toISOString(),
            constraintsPlusOn: state.showConstraintsPlus,
            note: els.ideationNote.value,
            cards: {},
        };

        state.reels.forEach((reel) => {
            if (isHidden(reel)) return;
            payload.cards[reel.deck.id] = reel.deck.values[reel.currentIndex];
        });

        els.saveStatus.textContent = "Saving...";

        const saver = globalThis.saveWaysToDraw;
        if (typeof saver !== "function") {
            els.saveStatus.textContent = "Save module missing; include save-draws.js.";
            return;
        }

        saver(payload, { source: "vintage" }).then((result) => {
            const id = result.saveCode ? " Save ID: " + result.saveCode + "." : "";
            els.saveStatus.textContent = "Saved." + id;
        });
    }

    let dragging = false;
    let startY = 0;
    let currentAngle = 0;

    function setLeverAngle(angle) {
        currentAngle = Math.max(0, Math.min(LEVER_MAX, angle));
        els.lever.style.transform = `rotate(${currentAngle}deg)`;
        const value = Math.round((currentAngle / LEVER_MAX) * 100);
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
        setLeverAngle(dy * 0.95);
    }

    function onLeverUp(event) {
        if (!dragging) return;
        dragging = false;
        try {
            els.lever.releasePointerCapture(event.pointerId);
        } catch (error) {}

        if (currentAngle >= LEVER_TRIGGER) {
            spinAll();
        }
        setLeverAngle(0);
    }

    function onConstraintsPlusToggle() {
        state.showConstraintsPlus = els.constraintsPlusToggle.checked;
        const extraReel = state.reels.find((reel) => reel.deck.id === "constraintsPlus");
        if (!extraReel) return;
        extraReel.reel.classList.toggle("hidden", !state.showConstraintsPlus);
    }

    els.ideationNote.addEventListener("input", () => {
        const len = els.ideationNote.value.length;
        els.charCount.textContent = `${len} / 500`;
    });

    els.constraintsPlusToggle.addEventListener("change", onConstraintsPlusToggle);
    els.spinButton.addEventListener("click", spinAll);
    els.saveButton.addEventListener("click", saveSelectedCards);
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

    buildReels();
    updateCardHeight();

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            updateCardHeight();
        }, 250);
    });
})();