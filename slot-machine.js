(function () {
    "use strict";

    let CARD_HEIGHT = 138;
    const COPIES = 12;
    const MID_COPY = 5;
    const LEVER_MAX = 62;
    const LEVER_TRIGGER = 40;
    const deckData = globalThis.WAYSTO_DECKS || {};

    const decks = [
        { id: "waysTo", label: "Ways To", values: deckData.waysTo || ["Error: No Data"] },
        { id: "users", label: "Users", values: deckData.users || ["Error: No Data"] },
        { id: "designLimit", label: "Design limit", values: deckData.designLimit || ["Error: No Data"] },
        { id: "audienceLimit", label: "Audience limit", values: deckData.audienceLimit || ["Error: No Data"] },
        { id: "constraintsPlus", label: "Constraints+", values: deckData.constraintsPlus || ["Error: No Data"] },
    ];

    const state = { reels: [], spinning: false, showConstraintsPlus: true };
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

    function buildReels() {
        els.reelBank.innerHTML = "";
        state.reels = [];
        decks.forEach((deck, index) => {
            const reel = document.createElement("article");
            reel.className = "reel";
            if (deck.id === "constraintsPlus" && !state.showConstraintsPlus) reel.classList.add("hidden");

            reel.innerHTML = `
                <h2 class="reel-title">${deck.label}</h2>
                <div class="window initial"><div class="strip"></div></div>
                <button type="button" class="lock-btn">Unlocked</button>
            `;

            const strip = reel.querySelector(".strip");
            for (let c = 0; c < COPIES; c++) {
                deck.values.forEach(v => {
                    const card = document.createElement("div");
                    card.className = "card";
                    card.innerHTML = `<div class="card-placeholder">${v}</div>`;
                    strip.appendChild(card);
                });
            }

            const len = deck.values.length;
            const currentIndex = Math.floor(Math.random() * len);
            strip.style.transform = `translateY(${- (MID_COPY * len + currentIndex) * CARD_HEIGHT}px)`;

            const lockBtn = reel.querySelector(".lock-btn");
            lockBtn.onclick = () => {
                if (state.reels[index].locked || !state.spinning) {
                    state.reels[index].locked = !state.reels[index].locked;
                    lockBtn.textContent = state.reels[index].locked ? "Locked" : "Unlocked";
                    lockBtn.classList.toggle("active", state.reels[index].locked);
                }
            };

            els.reelBank.appendChild(reel);
            state.reels.push({ deck, strip, lockBtn, locked: false, currentIndex, direction: index % 2 === 0 ? 1 : -1 });
        });
    }

    function spinAll() {
        if (state.spinning) return;
        
        // REMOVE LOGOS ON FIRST SPIN
        document.querySelectorAll('.window.initial').forEach(el => el.classList.remove('initial'));

        const spins = state.reels.map(reel => {
            if (reel.locked || (reel.deck.id === "constraintsPlus" && !state.showConstraintsPlus)) return Promise.resolve();
            return spinReel(reel);
        });

        state.spinning = true;
        els.spinButton.disabled = true;
        Promise.all(spins).finally(() => {
            state.spinning = false;
            els.spinButton.disabled = false;
        });
    }

    function spinReel(reel) {
        const len = reel.deck.values.length;
        const end = Math.floor(Math.random() * len);
        const turns = 3 + Math.floor(Math.random() * 3);
        const travel = reel.direction * (turns * len + ((end - reel.currentIndex + len) % len));
        const endSlot = (MID_COPY * len + reel.currentIndex) + travel;
        const ms = 2000 + Math.floor(Math.random() * 1000);

        reel.strip.style.transition = `transform ${ms}ms cubic-bezier(0.22, 0.85, 0.2, 1)`;
        reel.strip.style.transform = `translateY(${-endSlot * CARD_HEIGHT}px)`;

        return new Promise(resolve => {
            setTimeout(() => {
                reel.strip.style.transition = "none";
                reel.currentIndex = end;
                reel.strip.style.transform = `translateY(${- (MID_COPY * len + end) * CARD_HEIGHT}px)`;
                resolve();
            }, ms + 100);
        });
    }

    // Lever Logic
    let dragging = false, startY = 0, currentAngle = 0;
    function setAngle(a) {
        currentAngle = Math.max(0, Math.min(LEVER_MAX, a));
        els.lever.style.transform = `rotate(${currentAngle}deg)`;
    }

    els.lever.onpointerdown = e => { if (!state.spinning) { dragging = true; startY = e.clientY; els.lever.setPointerCapture(e.pointerId); } };
    els.lever.onpointermove = e => { if (dragging) setAngle((e.clientY - startY) * 0.8); };
    els.lever.onpointerup = () => { if (dragging) { if (currentAngle >= LEVER_TRIGGER) spinAll(); dragging = false; setAngle(0); } };

    els.spinButton.onclick = spinAll;
    els.ideationNote.oninput = () => { els.charCount.textContent = `${els.ideationNote.value.length} / 500`; };

    buildReels();
})();