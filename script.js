/* ============================================================
   A DIWALI SURPRISE FOR MAHI ❤️ — made with love by Aditya
   Cinematic engine: scenes · canvas FX · audio · controls
   Vanilla JS · Canvas API · Web Audio · no dependencies
   ============================================================ */
(function () {
  "use strict";

  /* ---------------------------------------------------------- setup */
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = Math.min(window.innerWidth, window.innerHeight) < 760 ||
                   (navigator.deviceMemory && navigator.deviceMemory <= 4);

  const $ = (sel) => document.querySelector(sel);
  const scenes = {
    intro: $("#s-intro"),
    diwali: $("#s-diwali"),
    name: $("#s-name"),
    heart: $("#s-heart"),
    final: $("#s-final")
  };

  const startBtn = $("#startBtn");
  const muteBtn = $("#muteBtn");
  const skipBtn = $("#skipBtn");
  const replayBtn = $("#replayBtn");
  const finalActions = $("#finalActions");
  const sweepEl = $("#sweep");

  /* ---------------------------------------------------------- timers */
  let timers = [];
  function after(ms, fn) {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }
  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  /* ============================================================
     AUDIO — original synthesized piano loop + silent fallback
     ============================================================ */
  const Sound = {
    el: null,
    ctx: null,
    master: null,
    src: null,
    started: false,
    muted: false,
    generative: false,
    padTimer: null,

    init() {
      try {
        this.el = new Audio("assets/music/diwali-piano.mp3");
        this.el.loop = true;
        this.el.preload = "auto";
        this.el.volume = 1;
      } catch (e) {
        this.el = null;
      }
    },

    /* AudioContext must be created/resumed inside the user gesture (iOS) */
    _ensureCtx() {
      if (this.ctx) {
        if (this.ctx.state === "suspended") this.ctx.resume();
        return this.ctx;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.0001;
        this.master.connect(this.ctx.destination);
        if (this.ctx.state === "suspended") this.ctx.resume();
        return this.ctx;
      } catch (e) {
        this.ctx = null;
        return null;
      }
    },

    start() {
      if (this.started) return;
      this.started = true;
      const ctx = this._ensureCtx();

      if (this.el) {
        if (ctx && this.master && !this.src) {
          try {
            this.src = ctx.createMediaElementSource(this.el);
            this.src.connect(this.master);
          } catch (e) { this.src = null; }
        }
        let p = null;
        try { p = this.el.play(); } catch (e) { p = null; }
        const ok = () => this._ramp(this.muted ? 0 : 0.8, 3);
        if (p && typeof p.then === "function") p.then(ok).catch(() => this._volRamp(0.75, 3));
        else ok();
        this.el.addEventListener("error", () => this._generative(), { once: true });
      } else {
        this._generative();
      }
    },

    _ramp(to, sec) {
      if (this.master && this.src) {
        try {
          const g = this.master.gain, t = this.ctx.currentTime;
          g.cancelScheduledValues(t);
          g.setValueAtTime(Math.max(0.0001, g.value), t);
          g.linearRampToValueAtTime(to, t + sec);
          return;
        } catch (e) { /* fall through */ }
      }
      this._volRamp(to, sec);
    },

    _volRamp(to, sec) {
      if (!this.el) return;
      const from = this.el.volume, t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / (sec * 1000));
        try { this.el.volume = from + (to - from) * k; } catch (e) { return; }
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },

    /* Fallback: gentle ambient pad (only if the mp3 cannot play) */
    _generative() {
      if (this.generative) return;
      const ctx = this._ensureCtx();
      if (!ctx || !this.master) return;
      try {
        this.generative = true;
        this._ramp(this.muted ? 0 : 0.17, 3);

        const chords = [
          [146.83, 220.0, 277.18], [138.59, 220.0, 277.18], [123.47, 185.0, 246.94],
          [98.0, 146.83, 196.0], [146.83, 220.0, 277.18], [110.0, 164.81, 220.0],
          [98.0, 146.83, 196.0], [110.0, 164.81, 220.0]
        ];
        let idx = 0;
        const voices = [];
        for (let i = 0; i < 3; i++) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          const f = ctx.createBiquadFilter();
          o.type = "sine";
          g.gain.value = 0;
          f.type = "lowpass";
          f.frequency.value = 700;
          o.connect(f); f.connect(g); g.connect(this.master);
          o.start();
          voices.push({ o, g });
        }
        const swap = () => {
          const ch = chords[idx % chords.length];
          idx++;
          const t = ctx.currentTime;
          voices.forEach((v, i) => {
            v.o.frequency.setTargetAtTime(ch[i], t, 1.2);
            v.g.gain.cancelScheduledValues(t);
            v.g.gain.setTargetAtTime(0.24, t, 1.5);
            v.g.gain.setTargetAtTime(0.0001, t + 3.4, 1.4);
          });
        };
        swap();
        this.padTimer = setInterval(swap, 4200);
      } catch (e) { /* audio is optional — never break the experience */ }
    },

    toggleMute() {
      this.muted = !this.muted;
      if (this.el) { try { this.el.muted = this.muted; } catch (e) {} }
      if (this.started) this._ramp(this.muted ? 0 : (this.generative ? 0.17 : 0.8), 0.5);
      muteBtn.classList.toggle("is-muted", this.muted);
      muteBtn.setAttribute("aria-label", this.muted ? "Unmute music" : "Mute music");
      return this.muted;
    }
  };

  /* ============================================================
     CANVAS FX — stars · motes · fireworks · petals · name · heart
     ============================================================ */
  const FX = (() => {
    const canvas = $("#fx");
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, dpr = 1;
    let mode = "intro";
    let dim = 0, dimTarget = 0;           // darkening for the name scene
    let nameAlpha = 1;
    let raf = 0, last = 0, running = false;

    const MAX_BITS = isMobile ? 300 : 460;
    const MAX_ROCKETS = isMobile ? 6 : 9;
    const MAX_PETALS = isMobile ? 14 : 22;
    const MAX_MOTES = isMobile ? 34 : 58;

    /* palette: festive yet elegant */
    const COLORS = [
      { hex: "#ffd98a", rgb: [255, 217, 138] },  // gold
      { hex: "#fff4dd", rgb: [255, 244, 221] },  // warm white
      { hex: "#ff8fa8", rgb: [255, 143, 168] },  // rose
      { hex: "#ff9b3d", rgb: [255, 155, 61] },   // ember
      { hex: "#7fe3b0", rgb: [127, 227, 176] },  // emerald
      { hex: "#8fb8ff", rgb: [143, 184, 255] },  // sapphire
      { hex: "#c39bff", rgb: [195, 155, 255] },  // violet
      { hex: "#ff6b6b", rgb: [255, 107, 107] }   // ruby
    ];
    const PETAL_COLORS = ["#f76d8e", "#e85d75", "#ffb3c1", "#d84a68"];

    /* pre-rendered glow sprites (fast, no shadowBlur) */
    const sprites = {};
    function makeGlow(rgb) {
      const s = document.createElement("canvas");
      s.width = s.height = 64;
      const c = s.getContext("2d");
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(0.25, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.72)`);
      g.addColorStop(0.6, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.22)`);
      g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
      return s;
    }
    COLORS.forEach((c) => { sprites[c.hex] = makeGlow(c.rgb); });
    sprites.gold = sprites["#ffd98a"];

    function glow(hex, x, y, r, a) {
      const sp = sprites[hex] || sprites.gold;
      ctx.globalAlpha = a;
      ctx.drawImage(sp, x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    }

    /* -------------------------------------------------- state pools */
    let stars = [], motes = [], rockets = [], bits = [], petals = [], flashes = [];
    let nameParts = [], ringParts = [];
    let fireTimer = 0, petalTimer = 0, nextFire = 1.2;

    function seedStars() {
      stars = [];
      const n = Math.round((W * H) / 5200);
      for (let i = 0; i < Math.min(n, 240); i++) {
        stars.push({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 1.1 + 0.35,
          ph: Math.random() * Math.PI * 2,
          sp: 0.4 + Math.random() * 1.2,
          a: 0.25 + Math.random() * 0.6
        });
      }
    }
    function seedMotes() {
      motes = [];
      for (let i = 0; i < MAX_MOTES; i++) motes.push(newMote(true));
    }
    function newMote(anywhere) {
      return {
        x: Math.random() * W,
        y: anywhere ? Math.random() * H : H + 12,
        vy: -(6 + Math.random() * 16),
        sway: 8 + Math.random() * 22,
        ph: Math.random() * Math.PI * 2,
        r: 5 + Math.random() * 13,
        a: 0.18 + Math.random() * 0.4
      };
    }

    /* -------------------------------------------------- fireworks */
    function spawnRocket() {
      if (rockets.length >= MAX_ROCKETS) return;
      const ty = H * (0.16 + Math.random() * 0.28);
      const sx = W * (0.1 + Math.random() * 0.8);
      const tx = W * (0.12 + Math.random() * 0.76);
      const g = 300;
      const v0 = Math.sqrt(2 * g * Math.max(60, H - ty));
      const tApex = v0 / g;
      const color = COLORS[(Math.random() * COLORS.length) | 0];
      const style = Math.random() < 0.16 ? "willow" : (Math.random() < 0.3 ? "ring" : "peony");
      rockets.push({
        x: sx, y: H + 6,
        vx: (tx - sx) / tApex,
        vy: -v0, g, ty, color, style,
        trail: []
      });
    }

    function explode(r) {
      const base = Math.min(W, H);
      const scale = Math.max(0.55, Math.min(1.35, base / 430));
      let n, spd, life, gravity;
      if (r.style === "willow") {
        n = isMobile ? 26 : 38; spd = [55, 125]; life = [2.6, 3.6]; gravity = 165;
      } else if (r.style === "ring") {
        n = isMobile ? 32 : 46; spd = [125, 158]; life = [1.8, 2.4]; gravity = 135;
      } else {
        n = isMobile ? 38 : 58; spd = [80, 230]; life = [1.6, 2.7]; gravity = 155;
      }
      n = Math.round(n * (reduced ? 0.55 : 1));
      const golden = r.style === "willow";
      for (let i = 0; i < n; i++) {
        const ang = r.style === "ring"
          ? (i / n) * Math.PI * 2 + Math.random() * 0.05
          : Math.random() * Math.PI * 2;
        const sp = (spd[0] + Math.random() * (spd[1] - spd[0])) * scale;
        const col = golden ? COLORS[0] : r.color;
        bits.push({
          x: r.x, y: r.y,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          life: life[0] + Math.random() * (life[1] - life[0]),
          max: 0, g: gravity, col, tw: Math.random() * Math.PI * 2,
          trail: []
        });
        bits[bits.length - 1].max = bits[bits.length - 1].life;
      }
      /* soft burst flash */
      flashes.push({ x: r.x, y: r.y, age: 0, life: 0.4, col: r.color, r: 80 * scale });
      while (bits.length > MAX_BITS) bits.shift();
      while (flashes.length > 14) flashes.shift();
    }

    /* -------------------------------------------------- petals */
    function spawnPetal() {
      if (petals.length >= MAX_PETALS) return;
      petals.push({
        x: Math.random() * W,
        y: -20,
        vy: 22 + Math.random() * 34,
        sway: 14 + Math.random() * 26,
        ph: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 1.6,
        size: 6 + Math.random() * 6,
        col: PETAL_COLORS[(Math.random() * PETAL_COLORS.length) | 0],
        a: 0.3 + Math.random() * 0.35
      });
    }

    /* -------------------------------------------------- name particles */
    let nameFormed = false;
    function buildName() {
      const host = document.querySelector(".name-space");
      const rect = host ? host.getBoundingClientRect() : { left: W / 2 - 100, top: H * 0.2, width: 200, height: 100 };
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const off = document.createElement("canvas");
      off.width = Math.max(2, Math.floor(W));
      off.height = Math.max(2, Math.floor(H));
      const o = off.getContext("2d");
      let fs = Math.min(W * 0.30, H * 0.20, 240);
      const font = (size) => `700 ${size}px Georgia, "Times New Roman", serif`;
      const text = "MAHI";
      const gapRatio = 0.16;
      const measure = (size) => {
        o.font = font(size);
        const ws = [];
        let w = 0;
        for (const ch of text) { const m = o.measureText(ch).width; ws.push(m); w += m; }
        w += size * gapRatio * (text.length - 1);
        return { ws, w };
      };
      let m = measure(fs);
      /* fit the word inside the screen no matter which serif font is available */
      const maxW = Math.min(W * 0.86, Math.max(rect.width, W * 0.6));
      if (m.w > maxW) {
        fs = Math.max(40, Math.floor(fs * (maxW / m.w)));
        m = measure(fs);
      }
      o.fillStyle = "#fff";
      o.textBaseline = "middle";
      o.textAlign = "left";
      const gap = fs * gapRatio;
      let x = cx - m.w / 2;
      for (let i = 0; i < text.length; i++) {
        o.fillText(text[i], x, cy);
        x += m.ws[i] + gap;
      }

      const img = o.getImageData(0, 0, off.width, off.height).data;
      let step = Math.max(3, Math.round(fs / 24));
      let pts = [];
      for (let y = 0; y < off.height; y += step) {
        for (let px = 0; px < off.width; px += step) {
          if (img[(y * off.width + px) * 4 + 3] > 130) pts.push([px, y]);
        }
      }
      /* shuffle + cap */
      for (let i = pts.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const t = pts[i]; pts[i] = pts[j]; pts[j] = t;
      }
      const cap = isMobile ? 950 : 1500;
      if (pts.length > cap) pts = pts.slice(0, cap);

      nameParts = pts.map(([tx, ty]) => {
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.max(W, H) * (0.55 + Math.random() * 0.5);
        return {
          x: cx + Math.cos(ang) * rad,
          y: cy + Math.sin(ang) * rad,
          tx, ty, vx: 0, vy: 0,
          size: 3.2 + Math.random() * 3.4,
          ph: Math.random() * Math.PI * 2,
          state: "fly"
        };
      });
      nameFormed = false;
    }

    function scatterName() {
      const host = document.querySelector(".name-space");
      const rect = host ? host.getBoundingClientRect() : null;
      const cx = rect ? rect.left + rect.width / 2 : W / 2;
      const cy = rect ? rect.top + rect.height / 2 : H * 0.35;
      nameParts.forEach((p) => {
        const dx = p.x - cx, dy = p.y - cy;
        const d = Math.hypot(dx, dy) || 1;
        p.vx = (dx / d) * (60 + Math.random() * 140);
        p.vy = (dy / d) * (60 + Math.random() * 140) - 30;
        p.state = "out";
        p.outAge = 0;
      });
    }

    /* -------------------------------------------------- heart ring */
    function buildRing() {
      ringParts = [];
      const host = document.querySelector(".heart-wrap");
      const r0 = host ? host.getBoundingClientRect() : { left: W / 2, top: H * 0.4, width: 120, height: 120 };
      const cx = r0.left + r0.width / 2;
      const cy = r0.top + r0.height / 2;
      const n = isMobile ? 22 : 34;
      for (let i = 0; i < n; i++) {
        ringParts.push({
          cx, cy,
          ang: (i / n) * Math.PI * 2,
          rad: Math.max(r0.width, 80) * (0.78 + Math.random() * 0.42),
          spd: (0.16 + Math.random() * 0.3) * (Math.random() < 0.5 ? -1 : 1),
          size: 6 + Math.random() * 11,
          ph: Math.random() * Math.PI * 2,
          a: 0
        });
      }
    }

    /* -------------------------------------------------- mode */
    function setMode(m) {
      mode = m;
      dimTarget = m === "name" ? 0.82 : (m === "heart" ? 0.35 : 0);
      if (m === "name") buildName();
      else if (nameParts.length) scatterName();
      if (m === "heart") buildRing();
      else ringParts = [];
      if (m === "diwali") { fireTimer = 0; nextFire = 0.25; }
      if (m === "final") { fireTimer = 0; nextFire = 1.4; }
      if (m === "intro" || m === "name") petals = [];
    }

    /* -------------------------------------------------- resize */
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.75 : 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedStars();
      if (mode === "name") buildName();
      if (mode === "heart") buildRing();
    }

    /* -------------------------------------------------- update */
    function update(dt, t) {
      dim += (dimTarget - dim) * Math.min(1, dt * 1.6);

      /* stars */
      /* (drawn only) */

      /* motes */
      for (const m of motes) {
        m.y += m.vy * dt;
        m.x += Math.sin(t * 0.4 + m.ph) * m.sway * dt;
        if (m.y < -20) Object.assign(m, newMote(false));
      }

      /* fireworks */
      if (mode === "diwali" || mode === "final") {
        fireTimer += dt;
        if (fireTimer >= nextFire) {
          fireTimer = 0;
          nextFire = mode === "final"
            ? 2.4 + Math.random() * 2.4
            : (reduced ? 1.5 + Math.random() * 1.1 : 0.7 + Math.random() * 0.95);
          spawnRocket();
          if (mode === "diwali" && Math.random() < 0.35) after(320, spawnRocket);
        }
      }
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.vy += r.g * dt;
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        r.trail.push(r.x, r.y);
        if (r.trail.length > 14) r.trail.splice(0, 2);
        if (r.vy >= 0 || r.y <= r.ty) { explode(r); rockets.splice(i, 1); }
      }
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i];
        b.life -= dt;
        if (b.life <= 0) { bits.splice(i, 1); continue; }
        b.vy += b.g * dt;
        const drag = Math.exp(-1.15 * dt);
        b.vx *= drag; b.vy *= drag;
        b.x += b.vx * dt; b.y += b.vy * dt;
        b.tw += dt * 14;
        b.trail.push(b.x, b.y);
        if (b.trail.length > 10) b.trail.splice(0, 2);
      }

      /* petals */
      if (mode === "diwali" || mode === "final" || mode === "heart") {
        petalTimer += dt;
        const gap = mode === "heart" ? 1.5 : (mode === "final" ? 1.15 : 0.75);
        if (petalTimer > gap) { petalTimer = 0; if (Math.random() < 0.85) spawnPetal(); }
      }
      for (let i = petals.length - 1; i >= 0; i--) {
        const p = petals[i];
        p.y += p.vy * dt;
        p.x += Math.sin(t * 0.7 + p.ph) * p.sway * dt;
        p.rot += p.vr * dt;
        if (p.y > H + 30) petals.splice(i, 1);
      }

      /* name particles */
      if (nameParts.length) {
        let close = 0;
        for (const p of nameParts) {
          if (p.state === "fly") {
            const dx = p.tx - p.x, dy = p.ty - p.y;
            p.vx += dx * 9 * dt;
            p.vy += dy * 9 * dt;
            const dmp = Math.exp(-3.1 * dt);
            p.vx *= dmp; p.vy *= dmp;
            p.x += p.vx * dt; p.y += p.vy * dt;
            if (Math.abs(dx) + Math.abs(dy) < 2.2) p.state = "hold";
          } else if (p.state === "hold") {
            close++;
            p.x = p.tx + Math.sin(t * 2.4 + p.ph) * 0.7;
            p.y = p.ty + Math.cos(t * 2.1 + p.ph) * 0.7;
          } else { /* scattered — drifts away and fades */
            p.outAge += dt;
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.vx *= Math.exp(-0.6 * dt); p.vy *= Math.exp(-0.6 * dt);
          }
        }
        if (!nameFormed && close > nameParts.length * 0.8) nameFormed = true;
        if (mode !== "name") {
          nameParts = nameParts.filter((p) => p.state !== "out" || p.outAge < 2.2);
        }
      }

      /* burst flashes */
      for (let i = flashes.length - 1; i >= 0; i--) {
        flashes[i].age += dt;
        if (flashes[i].age >= flashes[i].life) flashes.splice(i, 1);
      }

      /* heart ring */
      for (const r of ringParts) {
        r.ang += r.spd * dt;
        const target = mode === "heart" ? 1 : 0;
        r.a += (target - r.a) * Math.min(1, dt * 2);
      }
    }

    /* -------------------------------------------------- draw */
    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      const dimA = 1 - dim * 0.86;

      /* stars */
      ctx.fillStyle = "#e8ecff";
      for (const s of stars) {
        const tw = 0.6 + 0.4 * Math.sin(t * s.sp + s.ph);
        ctx.globalAlpha = s.a * tw * dimA * 0.9;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* golden motes */
      ctx.globalCompositeOperation = "lighter";
      for (const m of motes) {
        const pulse = 0.7 + 0.3 * Math.sin(t * 1.3 + m.ph);
        glow("#ffd98a", m.x, m.y, m.r, m.a * pulse * Math.max(0.18, dimA));
      }

      /* firework trails + heads */
      for (const r of rockets) {
        ctx.strokeStyle = "rgba(255,220,150,0.55)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let i = 0; i < r.trail.length; i += 2) {
          if (i === 0) ctx.moveTo(r.trail[0], r.trail[1]);
          else ctx.lineTo(r.trail[i], r.trail[i + 1]);
        }
        ctx.stroke();
        glow(r.color.hex, r.x, r.y, 11, 0.9);
      }
      for (const b of bits) {
        const k = b.life / b.max;
        const a = Math.min(1, k * 1.6) * (0.62 + 0.38 * Math.sin(b.tw));
        if (b.trail.length >= 4) {
          ctx.strokeStyle = `rgba(${b.col.rgb[0]},${b.col.rgb[1]},${b.col.rgb[2]},${(a * 0.5).toFixed(3)})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(b.trail[0], b.trail[1]);
          for (let i = 2; i < b.trail.length; i += 2) ctx.lineTo(b.trail[i], b.trail[i + 1]);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        glow(b.col.hex, b.x, b.y, 7.5, a * 0.9);
      }
      /* burst flashes */
      for (const f of flashes) {
        const k = 1 - f.age / f.life;
        glow(f.col.hex, f.x, f.y, f.r * (0.6 + 0.4 * (1 - k)), k * k * 0.5);
      }
      ctx.globalCompositeOperation = "source-over";

      /* petals */
      for (const p of petals) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.a;
        ctx.fillStyle = p.col;
        ctx.beginPath();
        const s = p.size;
        ctx.moveTo(0, -s);
        ctx.bezierCurveTo(s * 0.9, -s * 0.5, s * 0.75, s * 0.7, 0, s);
        ctx.bezierCurveTo(-s * 0.75, s * 0.7, -s * 0.9, -s * 0.5, 0, -s);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      /* heart orbit ring */
      if (ringParts.length) {
        ctx.globalCompositeOperation = "lighter";
        for (const r of ringParts) {
          const wob = Math.sin(t * 1.1 + r.ph) * 8;
          glow("#ffd98a",
            r.cx + Math.cos(r.ang) * (r.rad + wob),
            r.cy + Math.sin(r.ang) * (r.rad + wob) * 0.86,
            r.size, r.a * (0.5 + 0.4 * Math.sin(t * 2 + r.ph)));
        }
        ctx.globalCompositeOperation = "source-over";
      }

      /* name particles */
      if (nameParts.length) {
        ctx.globalCompositeOperation = "lighter";
        for (const p of nameParts) {
          const tw = 0.72 + 0.28 * Math.sin(t * 3 + p.ph);
          const a = p.state === "out"
            ? Math.max(0, 1 - p.outAge / 2.2) * 0.9
            : tw;
          glow("#ffd98a", p.x, p.y, p.size, a);
        }
        ctx.globalCompositeOperation = "source-over";
      }
    }

    /* -------------------------------------------------- loop */
    function frame(now) {
      if (!running) return;
      const t = now / 1000;
      let dt = (now - last) / 1000;
      last = now;
      if (!(dt > 0)) dt = 0.016;
      dt = Math.min(dt, 0.05);
      update(dt, t);
      draw(t);
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    resize();
    seedMotes();

    return { setMode, resize, start, stop, get mode() { return mode; } };
  })();

  /* ============================================================
     SCENE DIRECTOR — the cinematic timeline
     ============================================================ */
  const Director = {
    scene: "intro",
    started: false,

    show(name) {
      this.scene = name;
      for (const key in scenes) {
        scenes[key].classList.toggle("is-active", key === name);
      }
      FX.setMode(name);
      skipBtn.classList.toggle(
        "is-hidden",
        name === "final" || (name === "intro" && !this.started)
      );
    },

    sweepTo(name, delay) {
      if (reduced) { this.show(name); return; }
      sweepEl.classList.remove("is-sweeping");
      void sweepEl.offsetWidth;
      sweepEl.classList.add("is-sweeping");
      after(delay || 750, () => this.show(name));
    },

    /* ---- scene 1: opening (auto-plays) ---- */
    playIntro(resetOnly) {
      const l1 = $("#s-intro .line-1");
      const l2 = $("#s-intro .line-2");
      const nm = $("#introName");
      [l1, l2].forEach((el) => el.classList.remove("is-in", "is-out"));
      nm.classList.remove("is-revealed");
      startBtn.classList.remove("is-in");

      if (resetOnly) return;

      after(1500, () => l1.classList.add("is-in"));
      after(3900, () => l2.classList.add("is-in"));
      after(6300, () => nm.classList.add("is-revealed"));
      after(7400, () => {
        startBtn.classList.add("is-in");
        /* if music already running (replay), drift into the celebration */
        if (Sound.started) after(3400, () => this.toDiwali());
      });
    },

    /* ---- scene 2: diwali magic ---- */
    toDiwali() {
      if (this.scene !== "intro") return;
      const SW = 750; /* sweep transition length */
      this.sweepTo("diwali", SW);
      after(SW + 2200, () => $("#diwaliLine").classList.add("is-in"));
      after(SW + 7600, () => $("#diwaliLine").classList.add("is-out"));
      after(SW + 10600, () => this.toName());
    },

    /* ---- scene 3: her name in golden particles ---- */
    toName() {
      if (this.scene !== "diwali") return;
      const SW = 750;
      this.sweepTo("name", SW);
      after(SW + 4300, () => $("#nameSub").classList.add("is-in"));
      after(SW + 11200, () => $("#nameSub").classList.add("is-out"));
      after(SW + 12600, () => this.toHeart());
    },

    /* ---- scene 4: the heart ---- */
    toHeart() {
      if (this.scene !== "name") return;
      const SW = 750;
      this.sweepTo("heart", SW);
      after(SW + 1600, () => $("#heartLine").classList.add("is-in"));
      after(SW + 8300, () => $("#heartLine").classList.add("is-out"));
      after(SW + 9800, () => this.toFinal());
    },

    /* ---- scene 5: final message ---- */
    toFinal(quick) {
      clearTimers();
      this.sweepTo("final", quick ? 300 : 750);
      const lines = document.querySelectorAll(".f-line");
      const gap = quick ? 420 : 2350;
      const first = quick ? 500 : 950;
      lines.forEach((el) => el.classList.remove("is-in"));
      finalActions.classList.remove("is-in");
      lines.forEach((el, i) => after(first + i * gap, () => el.classList.add("is-in")));
      after(first + lines.length * gap + (quick ? 300 : 1400), () => {
        finalActions.classList.add("is-in");
        replayBtn.classList.add("is-in");
        skipBtn.classList.add("is-hidden");
      });
    },

    /* ---- skip ---- */
    skip() {
      if (this.scene === "final") return;
      if (!this.started) { Sound.start(); this.started = true; muteBtn.setAttribute("aria-label", "Mute music"); }
      clearTimers();
      /* fast-fade current scene text */
      document.querySelectorAll(".line.is-in, .f-line.is-in").forEach((el) => {
        el.classList.remove("is-in");
        el.classList.add("is-out");
      });
      this.toFinal(true);
    },

    /* ---- replay ---- */
    replay() {
      clearTimers();
      document.querySelectorAll(".line, .f-line").forEach((el) => {
        el.classList.remove("is-in", "is-out");
      });
      $("#introName").classList.remove("is-revealed");
      finalActions.classList.remove("is-in");
      replayBtn.classList.remove("is-in");
      this.show("intro");
      this.playIntro(false);
    },

    /* ---- begin after START ---- */
    begin() {
      if (this.started) return;
      this.started = true;
      Sound.start();
      skipBtn.classList.remove("is-hidden");
      this.toDiwali();
    }
  };

  /* ============================================================
     CONTROLS
     ============================================================ */
  startBtn.addEventListener("click", () => Director.begin());
  skipBtn.addEventListener("click", () => Director.skip());
  replayBtn.addEventListener("click", () => Director.replay());
  muteBtn.addEventListener("click", () => Sound.toggleMute());

  /* keyboard nicety on desktop */
  window.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
      if (Director.scene === "intro" && !Director.started) { e.preventDefault(); Director.begin(); }
    }
    if (e.key.toLowerCase() === "m") Sound.toggleMute();
  });

  /* ---------------------------------------------------------- lifecycle */
  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => FX.resize(), 150);
  }
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) FX.stop();
    else FX.start();
  });

  /* ---------------------------------------------------------- go */
  Sound.init();
  FX.start();
  Director.show("intro");
  Director.playIntro(false);

  /* lightweight handle for automated testing / console debugging */
  window.__mahi = { Director: Director, Sound: Sound, FX: FX };
})();
