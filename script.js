/* ================================================================
   script.js — Kesä Kalenteri
================================================================ */


// ── 1. INJECT RUNTIME STYLES ─────────────────────────────────────
// These styles require JS to be active, so they live here rather
// than style.css. They also strip the dev-stacking helpers from CSS.
(function () {
  const s = document.createElement('style');
  s.textContent = `
    /* Override dev stacking — all scenes hidden by default */
    .scene {
      display: none !important;
      position: fixed !important;
      inset: 0 !important;
      overflow-y: auto !important;
      margin-bottom: 0 !important;
      border-top: none !important;
    }
    .scene.active { display: flex !important; }

    /* Win overlays sit on top */
    #scene-win-12,
    #scene-win-24 { z-index: 20; }

    /* Hatch zoom transition */
    #main-hatch {
      transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      transform-origin: center center;
    }

    /* Memory card 3-D flip */
    .memory-card { perspective: 800px; }
    .card-inner {
      width: 100%; height: 100%;
      position: relative;
      transform-style: preserve-3d;
      transition: transform 0.4s ease;
    }
    .memory-card.flipped .card-inner,
    .memory-card.matched .card-inner { transform: rotateY(180deg); }
    .card-front,
    .card-back {
      position: absolute;
      inset: 0;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    .card-back { transform: rotateY(180deg); }
    .memory-card.matched { opacity: 0.5; pointer-events: none; }

    /* Win-12 slides in from the RIGHT */
    #scene-win-12.sliding-in {
      animation: slideFromRight 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    @keyframes slideFromRight {
      from { transform: translateX(100%); }
      to   { transform: translateX(0);    }
    }

    /* Win-24 slides in from the BOTTOM */
    #scene-win-24.sliding-in {
      animation: slideFromBottom 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    @keyframes slideFromBottom {
      from { transform: translateY(100%); }
      to   { transform: translateY(0);    }
    }

    /* Drag-and-drop visual feedback */
    .ranking-card.drag-over { outline: 3px dashed #FFD900; }
    .ranking-card.dragging  { opacity: 0.35; cursor: grabbing; }

    /* Calendar day-24 is clickable */
    [data-day="24"] { cursor: pointer; }
  `;
  document.head.appendChild(s);
})();


// ── 2. SCENE MANAGEMENT ──────────────────────────────────────────
function showScene(id) {
  document.querySelectorAll('.scene').forEach(el => el.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'scene-memory')  animateMemoryIn();
  if (id === 'scene-ranking') animateRankingIn();
}

// showOverlay keeps the current scene visible and slides a new one on top
function showOverlay(id) {
  const el = document.getElementById(id);
  el.classList.add('active');
  void el.offsetWidth;             // force reflow so CSS animation fires
  el.classList.add('sliding-in');
}


// ── 3. BOOT ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  showScene('scene-landing');
  initLanding();
  initMemoryGame();
  initRankingGame();
  initWheel();
});


// ── 4. LANDING PAGE ──────────────────────────────────────────────
function initLanding() {
  const hatch       = document.getElementById('main-hatch');
  const hatchNumber = document.getElementById('main-hatch-number');
  let activeDay     = 12;
  let animating     = false;

  // Clicking day-24 in the calendar swaps the big hatch
  const day24Cell = document.querySelector('[data-day="24"]');
  day24Cell.addEventListener('click', () => {
    if (animating) return;
    activeDay = 24;
    hatch.classList.remove('hatch-day-12');
    hatch.classList.add('hatch-day-24');
    hatchNumber.textContent = '24';
  });

  hatch.addEventListener('click', () => {
    if (animating) return;
    animating = true;
    const destination = activeDay === 12 ? 'scene-memory' : 'scene-ranking';
    openHatchAndZoom(activeDay, destination, () => { animating = false; });
  });
}

function openHatchAndZoom(activeDay, targetScene, onDone) {
  const scene    = document.getElementById('scene-landing');
  const hatch    = document.getElementById('main-hatch');
  const door     = document.getElementById('hatch-door');

  // Hide the small calendar cell so it doesn't float during animation
  const calCell  = document.querySelector(`.calendar-day[data-day="${activeDay}"]`);
  if (calCell) calCell.style.visibility = 'hidden';

  // ── STEP 1: Door swings open to the left (hinge on right edge) ──
  door.classList.add('open');

  // ── STEP 2: After door is open, zoom entire landing page into the hole ──
  setTimeout(() => {

    // Calculate transform-origin so the zoom centres on the hatch hole
    const hatchRect = hatch.getBoundingClientRect();
    const sceneRect = scene.getBoundingClientRect();
    const originX   = ((hatchRect.left + hatchRect.width  / 2) - sceneRect.left) / sceneRect.width  * 100;
    const originY   = ((hatchRect.top  + hatchRect.height / 2) - sceneRect.top)  / sceneRect.height * 100;

    scene.style.transformOrigin = `${originX}% ${originY}%`;
    scene.style.transition      = 'transform 0.7s cubic-bezier(0.4, 0, 0.6, 1)';
    scene.style.transform       = 'scale(20)';

    // ── STEP 3: Switch scene, reset everything silently ──
    setTimeout(() => {
      showScene(targetScene);

      // Kill transitions before resetting so there's no visible snap-back
      scene.style.transition      = 'none';
      scene.style.transform       = '';
      scene.style.transformOrigin = '';
      door.classList.remove('open');
      if (calCell) calCell.style.visibility = '';

      // Re-enable transitions next frame
      requestAnimationFrame(() => requestAnimationFrame(() => {
        scene.style.transition = '';
      }));

      if (onDone) onDone();
    }, 750);

  }, 600); // wait for door swing to finish
}


// ── 4b. MEMORY SCENE ENTRANCE ANIMATION ─────────────────────────
function animateMemoryIn() {
  const scene = document.getElementById('scene-memory');

  // Reset any previous animation state
  scene.querySelectorAll('.anim-slide-up').forEach(el => {
    el.classList.remove('anim-slide-up');
    void el.offsetWidth; // force reflow
  });

  // Gather elements in order: deco, title, row 1, row 2, row 3
  const deco   = scene.querySelector('.deco-top-center');
  const title  = scene.querySelector('.heading-main');
  const cards  = Array.from(scene.querySelectorAll('.memory-card'));

  // Cards are in a 3-col grid — split into 3 rows of 4
  const row1 = cards.slice(0, 3);
  const row2 = cards.slice(3, 6);
  const row3 = cards.slice(6, 9);
  const row4 = cards.slice(9, 12);

  const groups = [
    [deco, title],   // slide in together first
    row1,
    row2,
    row3,
    row4,
  ];

  // Apply class with staggered delay per group
  groups.forEach((group, i) => {
    group.forEach(el => {
      if (!el) return;
      el.style.animationDelay = `${i * 0.15}s`;
      // Force reflow so delay resets properly
      void el.offsetWidth;
      el.classList.add('anim-slide-up');
    });
  });
}

// ── 5. MEMORY GAME ───────────────────────────────────────────────
function initMemoryGame() {
  const grid  = document.querySelector('.memory-grid');

  // ---- Shuffle cards in the DOM ----
  const cards = Array.from(grid.querySelectorAll('.memory-card'));
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  cards.forEach(c => grid.appendChild(c));   // appendChild moves existing nodes

  // ---- Flip logic ----
  let flipped    = [];
  let locked     = false;
  let matchCount = 0;

  grid.querySelectorAll('.memory-card').forEach(card => {
    card.addEventListener('click', () => {
      if (locked)                                return;
      if (card.classList.contains('flipped'))   return;
      if (card.classList.contains('matched'))   return;

      card.classList.add('flipped');
      flipped.push(card);

      if (flipped.length < 2) return;  // wait for second card

      locked = true;
      const [a, b] = flipped;

      if (a.dataset.pair === b.dataset.pair) {
        // ✔ Match
        setTimeout(() => {
          a.classList.add('matched');
          b.classList.add('matched');
          flipped    = [];
          locked     = false;
          matchCount += 2;

          if (matchCount === cards.length) {
            // All pairs found — show win screen
            setTimeout(() => showOverlay('scene-win-12'), 600);
          }
        }, 400);
      } else {
        // ✘ No match — flip both back
        setTimeout(() => {
          a.classList.remove('flipped');
          b.classList.remove('flipped');
          flipped = [];
          locked  = false;
        }, 900);
      }
    });
  });
}


// ── 6. RANKING GAME ──────────────────────────────────────────────
// NOTE: HTML5 drag-and-drop does not fire on touch screens by default.
// A touch-drag polyfill (e.g. mobile-drag-drop) can be added later
// if needed for the QR-code / phone audience.
// ── 6b. PUSH FROM RIGHT helper ──────────────────────────────────
// Incoming scene pushes the current scene off to the left simultaneously
function slideInFromRight(incomingId) {
  const incoming = document.getElementById(incomingId);
  // Find the currently active scene
  const outgoing = document.querySelector('.scene.active');

  const dur = '0.55s cubic-bezier(0.4, 0, 0.2, 1)';

  // Position incoming off-screen to the right, make it visible
  incoming.style.transition = 'none';
  incoming.style.transform  = 'translateX(100%)';
  incoming.classList.add('active');
  void incoming.offsetWidth; // force reflow

  // Slide both simultaneously
  incoming.style.transition = `transform ${dur}`;
  incoming.style.transform  = 'translateX(0)';

  if (outgoing && outgoing !== incoming) {
    outgoing.style.transition = `transform ${dur}`;
    outgoing.style.transform  = 'translateX(-100%)';
  }

  setTimeout(() => {
    // Clean up — remove outgoing, reset styles
    if (outgoing && outgoing !== incoming) {
      outgoing.classList.remove('active');
      outgoing.style.transition = '';
      outgoing.style.transform  = '';
    }
    incoming.style.transition = '';
    incoming.style.transform  = '';
  }, 580);
}

// ── 6c. RANKING SCENE ENTRANCE ANIMATION ─────────────────────────
function animateRankingIn() {
  const scene = document.getElementById('scene-ranking');

  // Reset
  scene.querySelectorAll('.anim-slide-left').forEach(el => {
    el.classList.remove('anim-slide-left');
    void el.offsetWidth;
  });

  const title    = scene.querySelector('.ranking-title');
  const subtitle = scene.querySelector('.ranking-subtitle');
  const cards    = Array.from(scene.querySelectorAll('.ranking-card'));
  const btn      = scene.querySelector('.btn-continue-ranking');

  const groups = [
    [title, subtitle],
    [cards[0]],
    [cards[1]],
    [cards[2]],
    [cards[3]],
    [btn],
  ];

  groups.forEach((group, i) => {
    group.forEach(el => {
      if (!el) return;
      el.style.animationDelay = `${i * 0.12}s`;
      void el.offsetWidth;
      el.classList.add('anim-slide-left');
    });
  });
}

function initRankingGame() {
  const list = document.querySelector('.ranking-list');
  let dragSrc    = null;  // for mouse drag
  let touchSrc   = null;  // for touch drag
  let touchClone = null;  // floating visual clone while dragging
  let touchOffX  = 0;
  let touchOffY  = 0;

  function refreshNumbers() {
    // Update the static rank numbers column (outside the cards)
    const nums = document.querySelectorAll('.rank-num');
    // nums stay fixed — they always show 1,2,3,4 and never need updating
    // (the card order changes, not the numbers)
  }

  function insertCard(src, target) {
    if (!src || src === target) return;
    const all  = Array.from(list.querySelectorAll('.ranking-card'));
    const from = all.indexOf(src);
    const to   = all.indexOf(target);
    if (from < to) list.insertBefore(src, target.nextSibling);
    else           list.insertBefore(src, target);
    refreshNumbers();
  }

  // ── MOUSE drag-and-drop ──
  function attachDrag(card) {
    card.addEventListener('dragstart', () => {
      dragSrc = card;
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      list.querySelectorAll('.ranking-card').forEach(c => c.classList.remove('drag-over'));
    });
    card.addEventListener('dragover', e => {
      e.preventDefault();
      card.classList.add('drag-over');
    });
    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });
    card.addEventListener('drop', e => {
      e.preventDefault();
      card.classList.remove('drag-over');
      insertCard(dragSrc, card);
    });
  }

  // ── TOUCH drag-and-drop ──
  function attachTouch(card) {
    card.addEventListener('touchstart', e => {
      touchSrc = card;
      card.classList.add('dragging');

      const touch = e.touches[0];
      const rect  = card.getBoundingClientRect();
      touchOffX   = touch.clientX - rect.left;
      touchOffY   = touch.clientY - rect.top;

      // Create a floating clone so the user can see what they're dragging
      touchClone             = card.cloneNode(true);
      touchClone.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        opacity: 0.75;
        pointer-events: none;
        z-index: 999;
        margin: 0;
      `;
      document.body.appendChild(touchClone);
      e.preventDefault();
    }, { passive: false });

    card.addEventListener('touchmove', e => {
      if (!touchClone) return;
      const touch = e.touches[0];
      touchClone.style.left = `${touch.clientX - touchOffX}px`;
      touchClone.style.top  = `${touch.clientY - touchOffY}px`;

      // Highlight the card currently under the finger
      list.querySelectorAll('.ranking-card').forEach(c => c.classList.remove('drag-over'));
      touchClone.style.display = 'none';
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      touchClone.style.display = '';
      const target = el && el.closest('.ranking-card');
      if (target && target !== touchSrc) target.classList.add('drag-over');

      e.preventDefault();
    }, { passive: false });

    card.addEventListener('touchend', e => {
      if (!touchSrc) return;
      const touch = e.changedTouches[0];

      // Find what card the finger lifted over
      if (touchClone) { touchClone.style.display = 'none'; }
      const el     = document.elementFromPoint(touch.clientX, touch.clientY);
      if (touchClone) { touchClone.style.display = ''; }
      const target = el && el.closest('.ranking-card');

      list.querySelectorAll('.ranking-card').forEach(c => c.classList.remove('drag-over'));
      touchSrc.classList.remove('dragging');

      if (target && target !== touchSrc) insertCard(touchSrc, target);

      if (touchClone) { touchClone.remove(); touchClone = null; }
      touchSrc = null;
    });
  }

  list.querySelectorAll('.ranking-card').forEach(card => {
    attachDrag(card);
    attachTouch(card);
  });

  document.getElementById('ranking-continue-btn').addEventListener('click', () => {
    slideInFromRight('scene-wheel');
  });
}


// ── 7. SPIN THE WHEEL ────────────────────────────────────────────
/*
  14 sections layout:
  Index  0  →  -25%           (pink)
  Index  1  →  -10%           (purple)
  Index  2  →  -25%           (pink)
  Index  3  →  Ei voittoa     (green)
  Index  4  →  -10%           (purple)
  Index  5  →  -25%           (pink)
  Index  6  →  -50%           (hot pink)
  Index  7  →  -10%           (purple)
  Index  8  →  -25%           (pink)   ← 4th -25%
  Index  9  →  Ei voittoa     (blue)
  Index 10  →  -10%           (purple)
  Index 11  →  -50%           (hot pink)
  Index 12  →  -10%           (purple)
  Index 13  →  Ilmainen lippu (yellow)
  
  Total: 4×-25%  5×-10%  2×-50%  2×Ei voittoa  1×Ilmainen lippu = 14 ✓
*/
// 12 segments — organised so same colours are evenly spaced:
// 4x Et voittanut (#FF5858) at positions 0,3,6,9  — every 3rd slot
// 4x -10 %       (#8656E6) at positions 1,4,7,10  — every 3rd slot
// 2x -25 %       (#FF9428) at positions 2,8
// 1x -50 %       (#67B23F) at position  5
// 1x Ilmainen lippu (#48A6E0) at position 11
const WHEEL_SECTIONS = [
  { label: 'Et voittanut',    color: '#FF5858' },  // 0
  { label: '-10 %',           color: '#8656E6' },  // 1
  { label: '-25 %',           color: '#FF9428' },  // 2
  { label: 'Et voittanut',    color: '#FF5858' },  // 3
  { label: '-10 %',           color: '#8656E6' },  // 4
  { label: '-50 %',           color: '#67B23F' },  // 5
  { label: 'Et voittanut',    color: '#FF5858' },  // 6
  { label: '-10 %',           color: '#8656E6' },  // 7
  { label: '-25 %',           color: '#FF9428' },  // 8
  { label: 'Et voittanut',    color: '#FF5858' },  // 9
  { label: '-10 %',           color: '#8656E6' },  // 10
  { label: 'Ilmainen\nlippu', color: '#48A6E0' },  // 11
];

let wheelRotation = 0;   // radians; accumulates across spins
let wheelSpinning = false;

function initWheel() {
  const canvas = document.getElementById('wheel-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  drawWheel(ctx, wheelRotation);

  document.getElementById('wheel-spin-btn').addEventListener('click', () => {
    if (wheelSpinning) return;
    wheelSpinning = true;
    document.getElementById('wheel-spin-btn').disabled = true;
    spinWheel(ctx);
  });
}

function drawWheel(ctx, rotation) {
  const size  = 340;
  const cx    = size / 2, cy = size / 2, r = size / 2 - 6;
  const n     = WHEEL_SECTIONS.length;
  const slice = (2 * Math.PI) / n;

  ctx.clearRect(0, 0, size, size);

  WHEEL_SECTIONS.forEach((sec, i) => {
    const startAngle = rotation + i * slice;
    const endAngle   = rotation + (i + 1) * slice;
    const midAngle   = startAngle + slice / 2;

    // Filled slice — no stroke so no lines between segments
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = sec.color;
    ctx.fill();

    // Label — handle two-line labels split by \n
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(midAngle);
    ctx.textAlign    = 'right';
    ctx.fillStyle    = '#fff';
    ctx.font         = "bold 13px 'Secular One', sans-serif";
    ctx.shadowColor  = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur   = 3;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;

    const lines = sec.label.split('\n');
    if (lines.length === 1) {
      ctx.fillText(lines[0], r - 10, 5);
    } else {
      ctx.fillText(lines[0], r - 10, -4);
      ctx.fillText(lines[1], r - 10, 12);
    }
    ctx.restore();
  });

  // Hub circle in centre
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'transparent';
  ctx.fill();
}

function spinWheel(ctx) {
  const n         = WHEEL_SECTIONS.length;
  const slice     = (2 * Math.PI) / n;

  // Always land on one of the two -25% sections (indices 2, 8)
  const WIN_IDX   = [2, 8];
  const targetIdx = WIN_IDX[Math.floor(Math.random() * WIN_IDX.length)];

  // The angular centre of targetIdx in the wheel's own (un-rotated) space
  const sectionCenter = targetIdx * slice + slice / 2;

  // Pointer is on the RIGHT = angle 0 in canvas space.
  // We need: sectionCenter + finalRotation ≡ 0 (mod 2π)
  // → finalRotation = -sectionCenter (+ k×2π so we spin forward)
  let finalRotation = -sectionCenter;

  // Ensure finalRotation is ahead of the current position and includes 5-7 full spins
  const extraSpins = (5 + Math.floor(Math.random() * 3)) * 2 * Math.PI;
  while (finalRotation <= wheelRotation) finalRotation += 2 * Math.PI;
  finalRotation += extraSpins;

  const startRotation = wheelRotation;
  const totalDelta    = finalRotation - startRotation;
  const duration      = 3800;                          // ms
  const startTime     = performance.now();

  function animate(now) {
    const t      = Math.min((now - startTime) / duration, 1);
    // Ease-out quart: starts fast, brakes smoothly to a stop
    const eased  = 1 - Math.pow(1 - t, 4);
    const curRot = startRotation + totalDelta * eased;

    drawWheel(ctx, curRot);

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      wheelRotation = finalRotation;
      drawWheel(ctx, finalRotation);
      // Short pause, then slide win screen up from the bottom
      setTimeout(() => showOverlay('scene-win-24'), 700);
    }
  }

  requestAnimationFrame(animate);
}
