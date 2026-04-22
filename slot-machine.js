(function () {
    "use strict";

    let CARD_HEIGHT = 138;
    const COPIES = 12;
    const MID_COPY = 5;
    const LEVER_MAX = 62;
    const LEVER_TRIGGER = 40;
    const deckData = globalThis.WAYSTO_DECKS || {};

    const decks = [
        { id: "waysTo", label: "Ways To", values: deckData.waysTo || ["Error"] },
        { id: "users", label: "Users", values: deckData.users || ["Error"] },
        { id: "designLimit", label: "Design limit", values: deckData.designLimit || ["Error"] },
        { id: "audienceLimit", label: "Audience limit", values: deckData.audienceLimit || ["Error"] },
        { id: "constraintsPlus", label: "Constraints+", values: deckData.constraintsPlus || ["Error"] },
    ];

    const state = { reels: [], spinning: false };
    const els = {
        reelBank: document.getElementById("reelBank"),
        lever: document.getElementById("lever"),
        spinButton: document.getElementById("spinButton"),
        saveButton: document.getElementById("saveButton"),
        saveStatus: document.getElementById("saveStatus"),
        ideationNote: document.getElementById("ideationNote"),
        charCount: document.getElementById("charCount"),
    };

    // Both icons now included and ALWAYS present in the DOM
    const lockedIcon = `<svg class="lock-icon locked-icon" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/></svg>`;
    const unlockedIcon = `<svg class="lock-icon unlocked-icon" viewBox="0 0 24 24"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/></svg>`;

    function buildReels() {
        els.reelBank.innerHTML = "";
        state.reels = [];
        decks.forEach((deck, index) => {
            const reelEl = document.createElement("article");
            reelEl.className = "reel";

            reelEl.innerHTML = `
                <button type="button" class="reel-toggle-btn active" id="btn-${deck.id}">
                    <span class="reel-title-text">${deck.label}</span>
                    <div class="icon-container">${lockedIcon}${unlockedIcon}</div>
                </button>
                <div class="window initial"><div class="strip"></div></div>
            `;

            const strip = reelEl.querySelector(".strip");
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

            const toggleBtn = reelEl.querySelector(".reel-toggle-btn");
            toggleBtn.onclick = () => {
                const r = state.reels[index];
                r.hidden = !r.hidden;
                r.locked = r.hidden; // Auto-lock if hidden
                
                reelEl.classList.toggle("hidden-reel", r.hidden);
                // Class change for CSS to toggle icons
                toggleBtn.classList.toggle("not-active", r.hidden);
            };

            els.reelBank.appendChild(reelEl);
            state.reels.push({ 
                deck, strip, reelEl, toggleBtn,
                locked: false, hidden: false, 
                currentIndex, direction: index % 2 === 0 ? 1 : -1 
            });
        });
    }

    function spinAll() {
        if (state.spinning) return;
        document.querySelectorAll('.window.initial').forEach(el => el.classList.remove('initial'));

        const spins = state.reels.map(reel => {
            if (reel.locked || reel.hidden) return Promise.resolve();
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

    // Lever Controls
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