(function () {
    "use strict";

    const COPIES = 100; 
    const MID_COPY = 50; 
    const LEVER_TRIGGER = 45;
    const CARD_H = 138;

    const deckData = globalThis.WAYSTO_DECKS || {};
    const decks = [
        { id: "waysTo",   label: "Ways To",      values: deckData.waysTo          || ["Design", "Build", "Scale", "Fix", "Optimize"] },
        { id: "users",    label: "Users",         values: deckData.users           || ["Developers", "Designers", "Managers", "End-Users"] },
        { id: "limit",    label: "Design Limit",  values: deckData.designLimit     || ["Budget", "Timeframe", "Technology", "Usability"] },
        { id: "audience", label: "User Limit",      values: deckData.audienceLimit   || ["Enterprise", "Consumer", "Internal", "Global"] },
        { id: "extra",    label: "Constraints+",  values: deckData.constraintsPlus || ["Legacy Code", "Security", "Privacy", "AI Integration"] }
    ];

    const state = { reels: [], spinning: false };
    const els = { 
        reelBank:  document.getElementById("reelBank"), 
        lever:     document.getElementById("lever"), 
        spinBtn:   document.getElementById("spinButton"),
        saveBtn:   document.getElementById("saveButton"),
        savedList: document.getElementById("savedList"),
        userName:  document.getElementById("userName"),
        score:     document.getElementById("score"),
        note:      document.getElementById("ideationNote")
    };

    const SVG = {
        eyeOpen:   `<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>`,
        eyeClosed: `<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
        lockOpen:  `<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`,
        lockClose: `<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
    };

    function build() {
        els.reelBank.innerHTML = "";
        state.reels = [];
        
        decks.forEach((deck, i) => {
            const container = document.createElement("div");
            container.className = "reel-container";

            const header = document.createElement("div");
            header.className = "reel-header";

            const title = document.createElement("div");
            title.className = "reel-title";
            if (deck.id === "extra") {
                title.classList.add("bonus-title");
            }
            title.textContent = deck.label;

            const eyeBtn = document.createElement("button");
            eyeBtn.className = "icon-btn active";
            eyeBtn.title = "Toggle visibility";
            eyeBtn.innerHTML = SVG.eyeOpen;

            const lockBtn = document.createElement("button");
            lockBtn.className = "icon-btn";
            lockBtn.title = "Lock reel";
            lockBtn.innerHTML = SVG.lockOpen;

            header.appendChild(title);
            header.appendChild(eyeBtn);
            header.appendChild(lockBtn);

            const win = document.createElement("div");
            win.className = "window";

            const overlay = document.createElement("div");
            overlay.className = "window-overlay";

            const strip = document.createElement("div");
            strip.className = "strip";

            for (let c = 0; c < COPIES; c++) {
                deck.values.forEach(v => {
                    const card = document.createElement("div");
                    card.className = "card";
                    card.textContent = v;
                    strip.appendChild(card);
                });
            }

            win.appendChild(overlay);
            win.appendChild(strip);
            container.appendChild(header);
            container.appendChild(win);
            els.reelBank.appendChild(container);

            const startIdx = Math.floor(Math.random() * deck.values.length);
            strip.style.transform = `translateY(${-(MID_COPY * deck.values.length + startIdx) * CARD_H}px)`;

            let visible = true;
            let locked  = false;

            eyeBtn.onclick = () => {
                visible = !visible;
                win.classList.toggle("hidden", !visible);
                eyeBtn.innerHTML = visible ? SVG.eyeOpen : SVG.eyeClosed;
                eyeBtn.classList.toggle("active", visible);
            };

            lockBtn.onclick = () => {
                locked = !locked;
                lockBtn.innerHTML = locked ? SVG.lockClose : SVG.lockOpen;
                lockBtn.classList.toggle("active", locked);
            };

            state.reels.push({ 
                strip,
                overlay,
                win,
                currentIndex: startIdx, 
                values:    deck.values,
                len:       deck.values.length, 
                direction: i % 2 === 0 ? 1 : -1, 
                isLocked:  () => locked,
                spinCount: 0
            });
        });
    }

    async function spin() {
        if (state.spinning) return;
        state.spinning = true;

        state.reels.forEach(r => {
            if (!r.isLocked()) r.overlay.style.opacity = "0";
        });

        const tasks = state.reels.map((r, i) => {
            if (r.isLocked()) return Promise.resolve();

            r.spinCount++;

            const endIdx   = Math.floor(Math.random() * r.len);
            const rounds   = 25 + (i * 4);
            const travel   = r.direction * (rounds * r.len + ((endIdx - r.currentIndex + r.len) % r.len));
            const duration = 2500 + (i * 800);

            r.strip.style.transition = `transform ${duration}ms cubic-bezier(0.2, 0, 0.1, 1)`;
            const finalPos = (MID_COPY * r.len + r.currentIndex) + travel;
            r.strip.style.transform = `translateY(${-finalPos * CARD_H}px)`;

            return new Promise(resolve => {
                let finished = false;
                const complete = () => {
                    if (finished) return;
                    finished = true;
                    r.overlay.style.opacity = "1";
                    r.strip.style.transition = "none";
                    r.strip.style.transform = `translateY(${-(MID_COPY * r.len + endIdx) * CARD_H}px)`;
                    r.currentIndex = endIdx;
                    resolve();
                };

                const onTransitionEnd = event => {
                    if (event.propertyName !== "transform") return;
                    r.strip.removeEventListener("transitionend", onTransitionEnd);
                    complete();
                };

                r.strip.addEventListener("transitionend", onTransitionEnd);
                setTimeout(complete, duration + 100);
            });
        });

        await Promise.all(tasks);
        state.spinning = false;
    }

    function save() {
        if (state.spinning) return;
        const result = state.reels.map(r => ({
            value: r.values[r.currentIndex],
            visible: !r.win.classList.contains("hidden"),
            locked: r.isLocked(),
            spinCount: r.spinCount
        }));
        const resultText = result.map(r => r.value).join(" + ");
        const name = els.userName.value || "ANONYMOUS";
        const score = parseInt(els.score.value) || 0;
        const note = els.note.value     || "No notes.";
        
        const item = document.createElement("div");
        item.className = "save-item";
        item.dataset.score = score;
        item.innerHTML = `<strong>${name} (Score: ${score}):</strong> ${resultText}<br><small>${note}</small><br><small>Reel details: ${result.map(r => `${r.value} (${r.visible ? 'toggled' : 'untoggled'}, ${r.locked ? 'locked' : 'unlocked'}, re-spun ${r.spinCount} times)`).join('; ')}</small>`;
        
        // Insert in sorted order (highest score first)
        const items = Array.from(els.savedList.children).filter(el => el.classList.contains("save-item"));
        items.push(item);
        items.sort((a, b) => parseInt(b.dataset.score) - parseInt(a.dataset.score));
        els.savedList.innerHTML = '<h2>High Scores</h2>';
        items.forEach(i => els.savedList.appendChild(i));
    }

    let startY = 0, angle = 0, dragging = false;
    els.lever.onpointerdown = e => { if (!state.spinning) { dragging = true; startY = e.clientY; els.lever.setPointerCapture(e.pointerId); }};
    els.lever.onpointermove = e => { if (dragging) { angle = Math.min(60, Math.max(0, (e.clientY - startY) * 0.8)); els.lever.style.transform = `rotate(${angle}deg)`; }};
    els.lever.onpointerup   = () => { if (dragging) { if (angle >= LEVER_TRIGGER) spin(); dragging = false; els.lever.style.transform = `rotate(0deg)`; }};

    els.spinBtn.onclick = spin;
    els.saveBtn.onclick = save;

    build();

    window.addEventListener("resize", () => {
        state.reels.forEach(r => {
            r.strip.style.transition = "none";
            r.strip.style.transform = `translateY(${-(MID_COPY * r.len + r.currentIndex) * CARD_H}px)`;
        });
    });

})();