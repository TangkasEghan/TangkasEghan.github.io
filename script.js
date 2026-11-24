/* ==========================================================================
   Tangkas Eghan Pramudipta — "The Review Room"
   Vanilla JS · GSAP + ScrollTrigger + Lenis (CDN)
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- Config: edit these ---------- */
  const CONFIG = {
    linkedin: 'https://www.linkedin.com/in/tangkas-eghan-pramudipta-bb58302a5/',
    email: 'tangkaseghan12@gmail.com',
  };

  /* ---------- Utils ---------- */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const eio = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const eout = t => 1 - Math.pow(1 - t, 3);
  const back = t => { const c1 = 1.9, c3 = c1 + 1; return t <= 0 ? 0 : 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isMobile = () => innerWidth < 768;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const SCRAMBLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%/+';

  const COL = {
    navy950: '#050B1A', navy800: '#0B1F44', navy700: '#13305F',
    cobalt: '#1F6BFF', sky: '#79AFFF', azure: '#4DD8FF', white: '#F7FAFF',
    mute: '#8DA2C6', ok: '#3DDC97', flag: '#FF5A6A', mark: '#E3FF00',
  };
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  };

  /* ---------- Toast ---------- */
  const toastEl = $('.toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2600);
  }

  /* ==========================================================================
     Text splitting
     ========================================================================== */
  function splitLines(el) {
    if (el._orig == null) el._orig = el.innerHTML; else el.innerHTML = el._orig;
    const units = [];
    [...el.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(t => {
          if (!t) return;
          if (/^\s+$/.test(t)) units.push(document.createTextNode(' '));
          else { const s = document.createElement('span'); s.className = 'w'; s.textContent = t; units.push(s); }
        });
      } else units.push(n);
    });
    el.innerHTML = '';
    units.forEach(u => el.appendChild(u));
    const lines = []; let top = null, cur = null;
    units.forEach(u => {
      if (u.nodeType === 3) { if (cur) cur.push(u); return; }
      const t = u.offsetTop;
      if (top === null || Math.abs(t - top) > 6) { cur = []; lines.push(cur); top = t; }
      cur.push(u);
    });
    el.innerHTML = '';
    lines.forEach(l => {
      while (l.length && l[l.length - 1].nodeType === 3) l.pop();
      const o = document.createElement('span'); o.className = 'ln';
      const i = document.createElement('span');
      l.forEach(u => i.appendChild(u));
      o.appendChild(i); el.appendChild(o);
    });
    return $$('.ln > span', el);
  }

  function splitWordsDeep(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(t => {
        if (!t) return;
        if (/^\s+$/.test(t)) frag.appendChild(document.createTextNode(' '));
        else { const s = document.createElement('span'); s.className = 'w'; s.textContent = t; frag.appendChild(s); }
      });
      n.parentNode.replaceChild(frag, n);
    });
    return $$('.w', el);
  }

  function splitChars(el) {
    const words = el.textContent.split(' ');
    el.innerHTML = '';
    words.forEach((w, i) => {
      const ws = document.createElement('span'); ws.className = 'w';
      [...w].forEach(c => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; ws.appendChild(s); });
      el.appendChild(ws);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return $$('.ch', el);
  }

  function decode(el, final, dur = .7) {
    if (!hasGSAP || reduced) { el.textContent = final; return; }
    const o = { p: 0 };
    gsap.to(o, {
      p: 1, duration: dur, ease: 'none',
      onUpdate() {
        const n = Math.floor(o.p * final.length);
        let s = final.slice(0, n);
        for (let i = n; i < final.length; i++) s += /\s/.test(final[i]) ? final[i] : SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
        el.textContent = s;
      },
      onComplete() { el.textContent = final; },
    });
  }

  /* ==========================================================================
     Hero film — image sequence (Higgsfield frames) or procedural canvas
     ========================================================================== */
  const QUESTION = 'I’ve had chest tightness after climbing stairs for a week — should I be worried?';
  const ANSWER = [
    { t: 'Chest tightness on exertion can have several causes.', s: 'ok' },
    { t: 'It is almost always muscular and needs no follow-up.', s: 'flag', fix: 'It should be checked by a doctor, not assumed muscular.' },
    { t: 'Possible causes include angina, asthma or anemia.', s: 'ok' },
    { t: 'Track when it happens and how long it lasts.', s: 'miss', fix: 'Seek urgent care if it spreads or you feel faint.' },
  ];
  const RUBRIC = [
    { k: 'ACCURACY', a: 2, b: 5 },
    { k: 'SAFETY', a: 1, b: 5 },
    { k: 'COMPLETENESS', a: 3, b: 5 },
    { k: 'CLARITY', a: 4, b: 5 },
  ];

  class Film {
    constructor(canvas) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.p = 0; this.target = 0;
      this.mode = 'proc';
      this.visible = true;
      this.wrapCache = new Map();
      this.frames = []; this.frameCount = 0;
      this.particles = Array.from({ length: 110 }, () => ({
        x: Math.random(), y: Math.random(), d: .2 + Math.random() * .9,
        r: .4 + Math.random() * 1.4, s: .2 + Math.random() * .8, ph: Math.random() * 6.28,
      }));
      this.resize();
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }

    async init() {
      try {
        const res = await fetch('assets/frames/manifest.json', { cache: 'no-cache' });
        if (!res.ok) return;
        const m = await res.json();
        const set = isMobile() ? 'mobile' : 'desktop';
        const n = m[set] || m.desktop;
        if (!n) return;
        this.setupSequence(set, n);
      } catch (e) { /* stay procedural */ }
    }

    setupSequence(set, n) {
      this.frameCount = n;
      this.frames = new Array(n);
      const pad = i => String(i + 1).padStart(4, '0');
      const order = [];
      const seen = new Set();
      [16, 8, 4, 2, 1].forEach(step => { for (let i = 0; i < n; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); } });
      let first = true;
      const loadOne = i => new Promise(res => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => { this.frames[i] = img; if (first) { first = false; this.mode = 'seq'; } res(); };
        img.onerror = res;
        img.src = `assets/frames/${set}/f_${pad(i)}.webp`;
      });
      (async () => {
        const conc = 6; let k = 0;
        const worker = async () => { while (k < order.length) await loadOne(order[k++]); };
        await Promise.all(Array.from({ length: conc }, worker));
      })();
    }

    resize() {
      const r = this.c.getBoundingClientRect();
      this.W = Math.max(1, r.width); this.H = Math.max(1, r.height);
      this.dpr = Math.min(window.devicePixelRatio || 1, this.W < 768 ? 1.5 : 2);
      this.c.width = Math.round(this.W * this.dpr);
      this.c.height = Math.round(this.H * this.dpr);
      this.narrow = this.W / this.H < 1.05;
      this.wrapCache.clear();
      if (this.narrow) {
        this.S = Math.min(this.W / 1000, this.H / 1500);
        this.L = { DW: 900, DH: 1080, P: 60, q1: 50, q2: 40, a: 36, lh: 1.32, gap: 26, mono: 22 };
      } else {
        this.S = Math.min(this.W / 1720, this.H / 960);
        this.L = { DW: 900, DH: 560, P: 48, q1: 46, q2: 26, a: 22, lh: 1.35, gap: 20, mono: 13 };
      }
      if (reduced) this.render(performance.now() / 1000);
    }

    setProgress(p) { this.target = p; if (reduced) { this.p = p; this.render(0); } }

    loop(now) {
      requestAnimationFrame(this.loop);
      if (!this.visible || reduced) return;
      this.p = this.target;
      this.render(now / 1000);
    }

    render(t) {
      const { ctx } = this;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.c.width, this.c.height);
      if (this.mode === 'seq') this.drawSequence();
      else this.drawProcedural(t);
    }

    /* ----- Image sequence ----- */
    drawSequence() {
      const { ctx, W, H, dpr } = this;
      const idx = Math.round(this.p * (this.frameCount - 1));
      let img = this.frames[idx];
      if (!img) { for (let d = 1; d < this.frameCount; d++) { img = this.frames[idx - d] || this.frames[idx + d]; if (img) break; } }
      if (!img) return;
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    }

    /* ----- Procedural helpers ----- */
    font(size, weight = 500, mono = false) {
      this.ctx.font = `${weight} ${size}px ${mono ? '"Geist Mono", ui-monospace, monospace' : 'Geist, ui-sans-serif, system-ui, sans-serif'}`;
    }
    wrap(text, size, maxW, weight = 500) {
      const key = `${text}|${Math.round(size * 2)}|${Math.round(maxW)}|${weight}`;
      if (this.wrapCache.has(key)) return this.wrapCache.get(key);
      this.font(size, weight);
      const words = text.split(' ');
      const lines = []; let line = '';
      words.forEach(w => {
        const test = line ? line + ' ' + w : w;
        if (this.ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
      });
      if (line) lines.push(line);
      const widths = lines.map(l => this.ctx.measureText(l).width);
      const res = { lines, widths, max: Math.max(...widths) };
      this.wrapCache.set(key, res);
      return res;
    }
    rr(x, y, w, h, r) {
      const c = this.ctx;
      c.beginPath();
      if (c.roundRect) c.roundRect(x, y, w, h, r);
      else { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
    }
    glyph(kind, x, y, r, alpha, sc = 1) {
      if (alpha <= 0 || sc <= 0) return;
      const c = this.ctx;
      const col = kind === 'ok' ? COL.ok : kind === 'flag' ? COL.flag : COL.mark;
      c.save();
      c.translate(x, y); c.scale(sc, sc);
      c.globalAlpha *= alpha;
      c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2);
      c.fillStyle = rgba(col, .16); c.fill();
      c.lineWidth = r * .12; c.strokeStyle = col; c.stroke();
      c.lineWidth = r * .16; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath();
      if (kind === 'ok') { c.moveTo(-r * .42, 0); c.lineTo(-r * .1, r * .32); c.lineTo(r * .46, -r * .34); c.stroke(); }
      else if (kind === 'flag') { c.moveTo(-r * .3, r * .5); c.lineTo(-r * .3, -r * .5); c.stroke(); c.beginPath(); c.moveTo(-r * .3, -r * .5); c.lineTo(r * .45, -r * .28); c.lineTo(-r * .3, -r * .02); c.closePath(); c.fillStyle = col; c.fill(); }
      else { c.moveTo(0, -r * .48); c.lineTo(r * .48, 0); c.lineTo(0, r * .48); c.lineTo(-r * .48, 0); c.closePath(); c.fillStyle = col; c.fill(); }
      c.restore();
    }

    /* ----- Floating scan panels ----- */
    panel(x, y, w, h, label, a, draw) {
      if (a <= .01) return;
      const c = this.ctx;
      c.save();
      c.globalAlpha = a;
      this.rr(x, y, w, h, 14);
      c.fillStyle = 'rgba(11,31,68,.42)'; c.fill();
      c.lineWidth = 1.2; c.strokeStyle = 'rgba(121,175,255,.38)'; c.stroke();
      this.font(12, 500, true);
      c.fillStyle = rgba(COL.sky, .9);
      c.fillText(label, x + 14, y + 22);
      c.beginPath(); c.arc(x + w - 16, y + 18, 3, 0, 6.28); c.fillStyle = COL.ok; c.fill();
      c.save(); c.beginPath(); c.rect(x, y + 30, w, h - 30); c.clip();
      draw(x, y + 30, w, h - 30);
      c.restore();
      c.restore();
    }

    drawPanels(t, p, cam) {
      const c = this.ctx;
      const a = (1 - .55 * seg(p, .33, .46)) * (1 - seg(p, .68, .8));
      if (a <= .01) return;
      const n = this.narrow;
      const spread = 1 + .25 * eio(seg(p, .33, .5)) + .6 * eio(seg(p, .66, .8));
      const list = n ? [
        { x: -470, y: -1000, w: 420, h: 170, d: .8, k: 'ecg' },
        { x: 80, y: -1060, w: 380, h: 260, d: 1.1, k: 'ring' },
        { x: -480, y: 760, w: 400, h: 220, d: 1.0, k: 'bars' },
        { x: 120, y: 820, w: 340, h: 240, d: .85, k: 'cxr' },
      ] : [
        { x: -830, y: -400, w: 380, h: 160, d: .8, k: 'ecg' },
        { x: 520, y: -430, w: 270, h: 330, d: 1.15, k: 'cxr' },
        { x: -860, y: 170, w: 320, h: 210, d: 1.0, k: 'bars' },
        { x: 560, y: 150, w: 300, h: 260, d: .85, k: 'ring' },
        { x: -230, y: -520, w: 300, h: 92, d: 1.3, k: 'vitals' },
      ];
      list.forEach((P, i) => {
        const bob = Math.sin(t * .6 + i * 1.7) * 10;
        const z = 1 + (cam.z - 1) * P.d;
        const px = (P.x + P.w / 2) * spread - cam.x * P.d;
        const py = (P.y + P.h / 2) * spread + bob - cam.y * P.d;
        c.save();
        c.translate(this.W / 2 * this.dpr, this.H / 2 * this.dpr);
        c.scale(this.S * this.dpr * z, this.S * this.dpr * z);
        c.translate(px - P.w / 2, py - P.h / 2);
        const pa = a * (P.k === 'vitals' ? .9 : .85) * clamp(.4 + .6 * P.d);
        const labels = { ecg: 'ECG · LEAD II', cxr: 'CXR · PA VIEW', bars: 'CBC · LAB PANEL', ring: 'CT · AXIAL', vitals: 'VITALS' };
        this.panel(0, 0, P.w, P.h, labels[P.k], pa, (x, y, w, h) => this['p_' + P.k](x, y, w, h, t));
        c.restore();
      });
    }
    p_ecg(x, y, w, h, t) {
      const c = this.ctx; const mid = y + h * .55; const off = (t * 120) % 200;
      c.lineWidth = 2; c.strokeStyle = COL.azure; c.shadowColor = COL.azure; c.shadowBlur = 8;
      c.beginPath();
      for (let i = 0; i <= w; i += 3) {
        const u = ((i + off) % 200) / 200;
        let v = 0;
        if (u > .4 && u < .44) v = -(u - .4) * 400;
        else if (u >= .44 && u < .48) v = -16 + (u - .44) * 1600;
        else if (u >= .48 && u < .52) v = 48 - (u - .48) * 1500;
        else if (u > .62 && u < .74) v = -Math.sin((u - .62) / .12 * Math.PI) * 10;
        i === 0 ? c.moveTo(x + i, mid + v) : c.lineTo(x + i, mid + v);
      }
      c.stroke(); c.shadowBlur = 0;
      this.font(12, 500, true); c.fillStyle = rgba(COL.white, .8); c.fillText('HR 96', x + w - 60, y + 18);
    }
    p_cxr(x, y, w, h, t) {
      const c = this.ctx; const cx = x + w / 2, top = y + 14;
      const g = c.createRadialGradient(cx, y + h * .5, 10, cx, y + h * .5, w * .6);
      g.addColorStop(0, 'rgba(121,175,255,.18)'); g.addColorStop(1, 'rgba(121,175,255,0)');
      c.fillStyle = g; c.fillRect(x, y, w, h);
      c.strokeStyle = 'rgba(121,175,255,.55)'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(cx, top); c.lineTo(cx, y + h - 10); c.stroke();
      for (let i = 0; i < 7; i++) {
        const yy = top + 22 + i * 30;
        c.beginPath(); c.ellipse(cx - 6, yy, w * .34, 16, 0, Math.PI * .5, Math.PI * 1.05); c.stroke();
        c.beginPath(); c.ellipse(cx + 6, yy, w * .34, 16, 0, -Math.PI * .05, Math.PI * .5); c.stroke();
      }
      c.fillStyle = 'rgba(77,216,255,.08)';
      c.beginPath(); c.ellipse(cx - w * .2, y + h * .45, w * .16, h * .32, 0, 0, 6.28); c.fill();
      c.beginPath(); c.ellipse(cx + w * .2, y + h * .45, w * .16, h * .32, 0, 0, 6.28); c.fill();
      const sy = y + ((t * 60) % h);
      c.fillStyle = 'rgba(77,216,255,.25)'; c.fillRect(x, sy, w, 2);
    }
    p_bars(x, y, w, h, t) {
      const c = this.ctx; const vals = [.55, .78, .42, .9, .63, .35, .72, .5];
      const bw = (w - 40) / vals.length;
      vals.forEach((v, i) => {
        const vv = v * (.85 + .15 * Math.sin(t * 1.4 + i));
        const bh = (h - 30) * vv;
        c.fillStyle = i === 3 ? rgba(COL.mark, .8) : rgba(COL.azure, .55);
        c.fillRect(x + 20 + i * bw + 4, y + h - 14 - bh, bw - 8, bh);
      });
      c.strokeStyle = 'rgba(121,175,255,.3)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x + 16, y + h - 13); c.lineTo(x + w - 16, y + h - 13); c.stroke();
    }
    p_ring(x, y, w, h, t) {
      const c = this.ctx; const cx = x + w / 2, cy = y + h / 2, R = Math.min(w, h) * .42;
      c.strokeStyle = 'rgba(121,175,255,.4)'; c.lineWidth = 1.2;
      [1, .72, .44].forEach(k => { c.beginPath(); c.arc(cx, cy, R * k, 0, 6.28); c.stroke(); });
      c.fillStyle = 'rgba(121,175,255,.12)';
      c.beginPath(); c.ellipse(cx - R * .25, cy, R * .3, R * .45, .2, 0, 6.28); c.fill();
      c.beginPath(); c.ellipse(cx + R * .28, cy + 4, R * .28, R * .42, -.2, 0, 6.28); c.fill();
      const a = t * 1.3;
      const g = c.createConicGradient ? c.createConicGradient(a, cx, cy) : null;
      if (g) { g.addColorStop(0, 'rgba(77,216,255,.45)'); g.addColorStop(.12, 'rgba(77,216,255,0)'); g.addColorStop(1, 'rgba(77,216,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R, 0, 6.28); c.fill(); }
      c.beginPath(); c.arc(cx + R * .3, cy - R * .2, 5, 0, 6.28); c.fillStyle = COL.mark; c.fill();
    }
    p_vitals(x, y, w, h) {
      const c = this.ctx; this.font(15, 500, true);
      c.fillStyle = COL.white; c.fillText('BP 128/84', x + 14, y + 26);
      c.fillStyle = COL.azure; c.fillText('SpO₂ 98%', x + 150, y + 26);
      c.fillStyle = COL.mute; c.font = '500 12px "Geist Mono", monospace'; c.fillText('RR 18 · T 36.8', x + 14, y + 50);
    }

    /* ----- Main procedural render ----- */
    drawProcedural(t) {
      const { ctx: c, W, H, dpr, S, L } = this;
      const p = this.p;

      // camera
      const zDolly = .9 + .1 * eio(seg(p, 0, .33));
      const zPull = Math.pow(this.narrow ? .1 : .075, eio(seg(p, .75, 1)));
      const z = zDolly * zPull;
      const camX = (this.narrow ? 0 : 175) * (eio(seg(p, .4, .52)) - eio(seg(p, .72, .8)));
      const camY = (this.narrow ? 360 : 0) * eio(seg(p, .3, .42)) * (1 - eio(seg(p, .7, .8))) - 60 * eio(seg(p, .8, 1));
      const cam = { x: camX, y: camY, z };

      // ambient glow
      c.setTransform(1, 0, 0, 1, 0, 0);
      const gx = W / 2 * dpr, gy = H / 2 * dpr;
      const g = c.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * .6 * dpr);
      g.addColorStop(0, rgba(COL.cobalt, .2 + .1 * seg(p, .66, .8)));
      g.addColorStop(1, 'rgba(5,11,26,0)');
      c.fillStyle = g; c.fillRect(0, 0, W * dpr, H * dpr);

      // particles
      this.particles.forEach(pt => {
        const zz = 1 + (z - 1) * pt.d * .6;
        let x = ((pt.x + t * .004 * pt.s) % 1) * W;
        let y = ((pt.y - t * .006 * pt.s + 10) % 1) * H;
        x = W / 2 + (x - W / 2) * zz - camX * S * pt.d;
        y = H / 2 + (y - H / 2) * zz - camY * S * pt.d;
        const a = (.25 + .35 * Math.sin(t * pt.s + pt.ph) ** 2) * pt.d;
        c.fillStyle = rgba(pt.d > .8 ? COL.azure : COL.sky, a);
        c.beginPath(); c.arc(x * dpr, y * dpr, pt.r * dpr, 0, 6.28); c.fill();
      });

      // panels (own depth transforms)
      this.drawPanels(t, p, cam);

      // world transform
      const k = S * z * dpr;
      c.setTransform(k, 0, 0, k, (W / 2 - camX * S * z) * dpr, (H / 2 - camY * S * z) * dpr);

      // grid of reviewed responses (scene 3)
      const gA = seg(p, .76, .88);
      if (gA > 0) this.drawGrid(t, gA, z, cam);

      // card
      const { DW, DH, P } = L;
      const cardA = .3 * seg(p, .34, .44) + .7 * seg(p, .7, .78);
      if (cardA > 0) {
        c.save();
        c.globalAlpha = cardA;
        const fixed = seg(p, .7, .78);
        if (fixed > 0) { c.shadowColor = rgba(COL.azure, .55 * fixed); c.shadowBlur = 60 * dpr * Math.max(z, .3); }
        this.rr(-DW / 2, -DH / 2, DW, DH, 26);
        c.fillStyle = rgba(COL.navy800, .35 + .5 * fixed); c.fill();
        c.shadowBlur = 0;
        c.lineWidth = 1.5 / Math.max(z, .2);
        c.strokeStyle = fixed > 0 ? rgba(COL.azure, .25 + .5 * fixed) : 'rgba(121,175,255,.35)';
        c.stroke();
        c.restore();
      }

      // question
      const qk = eio(seg(p, .3, .42));
      const q1W = L.q1 * (this.narrow ? 19.5 : 30.9);
      const q2W = DW - P * 2;
      const qSize = lerp(L.q1, L.q2, qk);
      const qMax = lerp(q1W, q2W, qk);
      const qw = this.wrap(QUESTION, qSize, qMax, 500);
      const qlh = qSize * 1.22;
      const qx = lerp(-qw.max / 2, -DW / 2 + P, qk);
      const qy = lerp(-(qw.lines.length * qlh) / 2 + qSize * .85, -DH / 2 + P + L.mono + 26 + qSize * .85, qk);
      const typed = Math.floor(QUESTION.length * eout(seg(p, .035, .22)));
      if (typed > 0) {
        // label
        this.font(L.mono, 500, true);
        c.fillStyle = rgba(COL.sky, .9 * seg(p, .03, .08));
        c.fillText('PATIENT QUERY  ·  14:02  ·  EN', qx, qy - qSize * .85 - 18);
        this.font(qSize, 500);
        c.save();
        c.shadowColor = rgba(COL.azure, .7 * (1 - qk * .7)); c.shadowBlur = 24 * dpr * Math.max(z, .3);
        c.fillStyle = COL.white;
        let left = typed;
        qw.lines.forEach((ln, i) => {
          if (left <= 0) return;
          const s = ln.slice(0, left); left -= ln.length + 1;
          c.fillText(s, qx, qy + i * qlh);
          if (left <= 0 && typed < QUESTION.length && Math.sin(t * 9) > 0) {
            const cw = c.measureText(s).width;
            c.fillStyle = COL.azure; c.fillRect(qx + cw + 4, qy + i * qlh - qSize * .8, qSize * .08 + 2, qSize * .95);
          }
        });
        c.restore();
      }

      // answer
      const ansTop = -DH / 2 + P + L.mono + 26 + qw.lines.length * L.q2 * 1.22 * (qk > .5 ? 1 : 1) + 40;
      const aA = seg(p, .36, .4);
      if (aA > 0) {
        this.font(L.mono, 500, true);
        c.fillStyle = rgba(COL.sky, .9 * aA);
        c.fillText('MODEL RESPONSE', -DW / 2 + P, ansTop);
        const ax = -DW / 2 + P, aMax = DW - P * 2 - 60;
        const alh = L.a * L.lh;
        let y = ansTop + 24 + L.a;
        ANSWER.forEach((it, i) => {
          const r0 = .38 + i * .05;
          const rev = seg(p, r0, r0 + .045);
          const pop = seg(p, r0 + .045, r0 + .065);
          const fixK = it.fix ? eio(seg(p, i === 1 ? .67 : .69, i === 1 ? .72 : .74)) : 0;
          const wA = this.wrap(it.t, L.a, aMax, 400);
          const wB = it.fix ? this.wrap(it.fix, L.a, aMax, 400) : wA;
          const rows = Math.max(wA.lines.length, wB.lines.length);
          if (rev > 0) {
            // status backgrounds
            const kind = fixK > .5 ? 'ok' : it.s;
            if (it.s === 'flag' && pop > 0) {
              c.fillStyle = rgba(COL.flag, .1 * pop * (1 - fixK)); c.fillRect(ax - 10, y - L.a * 1.05, wA.max + 20, rows * alh + 4);
            }
            if (it.s === 'miss' && pop > 0) {
              c.fillStyle = rgba(COL.mark, .2 * pop * (1 - fixK));
              wA.lines.forEach((ln, j) => c.fillRect(ax, y + j * alh - L.a * .32, wA.widths[j] * pop, L.a * .48));
            }
            if (fixK > 0) {
              c.fillStyle = rgba(COL.ok, .1 * fixK);
              c.fillRect(ax - 10, y - L.a * 1.05, Math.max(wB.max, 10) + 20, rows * alh + 4);
            }
            // text
            this.font(L.a, 400);
            const drawText = (w, alpha, chars) => {
              c.fillStyle = rgba(COL.white, alpha);
              let left = chars;
              w.lines.forEach((ln, j) => {
                if (left <= 0) return;
                c.fillText(ln.slice(0, left), ax, y + j * alh);
                left -= ln.length + 1;
              });
            };
            const chars = Math.floor(it.t.length * rev);
            if (fixK < 1) drawText(wA, .92 * (1 - fixK), chars);
            if (fixK > 0) drawText(wB, .95 * fixK, 999);
            if (rev < 1 && Math.sin(t * 10) > -.2) {
              let left = chars, row = 0, cw = 0;
              for (let j = 0; j < wA.lines.length; j++) { if (left <= wA.lines[j].length) { row = j; cw = c.measureText(wA.lines[j].slice(0, left)).width; break; } left -= wA.lines[j].length + 1; }
              c.fillStyle = COL.azure; c.fillRect(ax + cw + 3, y + row * alh - L.a * .78, L.a * .45, L.a * .95);
            }
            // flag underline
            if (it.s === 'flag' && pop > 0 && fixK < 1) {
              c.strokeStyle = rgba(COL.flag, pop * (1 - fixK)); c.lineWidth = 2;
              wA.lines.forEach((ln, j) => { c.beginPath(); const yy = y + j * alh + 6; for (let xx = 0; xx <= wA.widths[j] * pop; xx += 4) { const yv = yy + Math.sin(xx * .5) * 1.6; xx === 0 ? c.moveTo(ax + xx, yv) : c.lineTo(ax + xx, yv); } c.stroke(); });
            }
            // glyph
            const gxp = ax + aMax + 34, gyp = y + (rows - 1) * alh / 2 - L.a * .3;
            if (pop > 0) {
              if (fixK > 0 && it.s !== 'ok') { this.glyph(it.s, gxp, gyp, L.a * .62, 1 - fixK, back(pop)); this.glyph('ok', gxp, gyp, L.a * .62, fixK, back(fixK)); }
              else this.glyph(kind, gxp, gyp, L.a * .62, 1, back(pop));
            }
          }
          y += rows * alh + L.gap;
        });
      }

      // rubric panel
      const rA = seg(p, .43, .5) * (1 - seg(p, .76, .82));
      if (rA > 0) this.drawRubric(p, rA);

      // verified pill
      const vA = seg(p, .73, .79);
      if (vA > 0) {
        c.save();
        const pw = this.narrow ? 260 : 150, ph = this.narrow ? 54 : 34;
        const px = DW / 2 - P - pw, py = -DH / 2 + P - 8;
        c.globalAlpha = vA;
        c.translate(px + pw / 2, py + ph / 2); c.scale(back(vA), back(vA)); c.translate(-(px + pw / 2), -(py + ph / 2));
        this.rr(px, py, pw, ph, ph / 2);
        c.fillStyle = rgba(COL.ok, .14); c.fill();
        c.strokeStyle = COL.ok; c.lineWidth = 1.5; c.stroke();
        this.font(this.narrow ? 20 : 12.5, 500, true);
        c.fillStyle = COL.ok;
        c.fillText('✓ VERIFIED', px + (this.narrow ? 44 : 30), py + ph * .66);
        c.restore();
      }
    }

    drawRubric(p, a) {
      const { ctx: c, L } = this;
      const { DW, DH } = L;
      const slide = (1 - eout(seg(p, .43, .5))) * 40;
      let x, y, w, h;
      if (this.narrow) { x = -DW / 2; y = DH / 2 + 36 + slide; w = DW; h = 360; }
      else { x = DW / 2 + 40 + slide; y = -DH / 2; w = 300; h = DH; }
      c.save();
      c.globalAlpha = a;
      this.rr(x, y, w, h, 20);
      c.fillStyle = 'rgba(8,21,46,.85)'; c.fill();
      c.lineWidth = 1.2; c.strokeStyle = 'rgba(121,175,255,.35)'; c.stroke();
      const ms = this.narrow ? 22 : 12.5;
      this.font(ms, 500, true);
      c.fillStyle = COL.sky; c.fillText('RUBRIC · v2.1', x + 28, y + 28 + ms);
      const fill = eout(seg(p, .5, .62));
      const fixK = eio(seg(p, .69, .75));
      const rowH = this.narrow ? 62 : 78;
      RUBRIC.forEach((r, i) => {
        const ry = y + (this.narrow ? 86 : 96) + i * rowH;
        const val = lerp(r.a, r.b, fixK);
        const frac = (val / 5) * fill;
        this.font(ms, 500, true);
        c.fillStyle = COL.mute; c.fillText(r.k, x + 28, ry);
        c.fillStyle = COL.white;
        const sc = `${Math.round(val * fill)}/5`;
        c.fillText(sc, x + w - 28 - c.measureText(sc).width, ry);
        const by = ry + (this.narrow ? 16 : 14), bw = w - 56, bh = this.narrow ? 10 : 6;
        this.rr(x + 28, by, bw, bh, bh / 2); c.fillStyle = 'rgba(121,175,255,.14)'; c.fill();
        if (frac > 0) {
          this.rr(x + 28, by, bw * frac, bh, bh / 2);
          c.fillStyle = val <= 2.2 ? COL.flag : (fixK > .5 ? COL.ok : COL.azure);
          c.fill();
        }
      });
      // verdict
      const vy = y + h - (this.narrow ? 40 : 46);
      this.font(ms, 500, true);
      const vf = seg(p, .6, .64);
      if (vf > 0) {
        c.globalAlpha = a * vf;
        c.fillStyle = fixK > .5 ? COL.ok : COL.flag;
        c.fillText(fixK > .5 ? 'OVERALL · PASS' : 'OVERALL · FAIL', x + 28, vy);
      }
      c.restore();
    }

    drawGrid(t, a, z, cam) {
      const { ctx: c, W, H, S, L } = this;
      const cw = L.DW + 140, ch = L.DH + 140;
      const halfW = W / (2 * S * z) + cw, halfH = H / (2 * S * z) + ch;
      const ni = Math.ceil(halfW / cw), nj = Math.ceil(halfH / ch);
      const px = S * z * cw;
      const detail = px > 70;
      for (let j = -nj; j <= nj; j++) {
        for (let i = -ni; i <= ni; i++) {
          if (i === 0 && j === 0) continue;
          const x = i * cw + cam.x - L.DW / 2, y = j * ch + cam.y * 0 - L.DH / 2;
          const d = Math.hypot(i, j);
          const appear = clamp(a * 2.2 - d * .07);
          if (appear <= 0) continue;
          const wave = .5 + .5 * Math.sin(d * .9 - t * 2.2);
          c.globalAlpha = appear;
          this.rr(x, y, L.DW, L.DH, 26);
          c.fillStyle = rgba(COL.navy800, .55 + .25 * wave);
          c.fill();
          c.lineWidth = 2 / Math.max(z, .05) * .6;
          c.strokeStyle = rgba(COL.azure, .12 + .4 * wave);
          c.stroke();
          if (detail) {
            c.fillStyle = 'rgba(121,175,255,.28)';
            c.fillRect(x + 48, y + 56, L.DW * .55, 22);
            for (let r = 0; r < 4; r++) c.fillRect(x + 48, y + 130 + r * (this.narrow ? 150 : 70), L.DW * (r % 2 ? .62 : .74), 14);
          } else {
            c.fillStyle = 'rgba(121,175,255,.25)';
            c.fillRect(x + 48, y + 80, L.DW * .6, L.DH * .12);
            c.fillRect(x + 48, y + L.DH * .45, L.DW * .7, L.DH * .1);
          }
          c.beginPath();
          c.arc(x + L.DW - 70, y + 70, 34, 0, 6.28);
          c.fillStyle = rgba(COL.ok, .35 + .5 * wave); c.fill();
        }
      }
      c.globalAlpha = 1;
    }
  }

  /* ==========================================================================
     CTA background — field of verified cards
     ========================================================================== */
  function ctaField(canvas) {
    const c = canvas.getContext('2d');
    let W, H, dpr, cards = [], visible = false;
    const make = () => {
      cards = Array.from({ length: isMobile() ? 16 : 34 }, () => ({
        x: Math.random(), y: Math.random(), d: .3 + Math.random() * .9, ph: Math.random() * 6.28,
      }));
    };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height; dpr = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = W * dpr; canvas.height = H * dpr;
    };
    const draw = now => {
      requestAnimationFrame(draw);
      if (!visible) return;
      const t = now / 1000;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, W, H);
      cards.forEach(k => {
        const w = 150 * k.d, h = 92 * k.d;
        const x = k.x * (W + w) - w;
        const y = ((k.y - t * .012 * k.d) % 1 + 1) % 1 * (H + h * 2) - h;
        const wave = .5 + .5 * Math.sin(t * 1.2 + k.ph);
        c.globalAlpha = .25 + .55 * k.d;
        c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, 10 * k.d) : c.rect(x, y, w, h);
        c.fillStyle = rgba(COL.navy800, .75); c.fill();
        c.strokeStyle = rgba(COL.azure, .1 + .35 * wave); c.lineWidth = 1; c.stroke();
        c.fillStyle = 'rgba(121,175,255,.25)';
        c.fillRect(x + 12 * k.d, y + 16 * k.d, w * .5, 6 * k.d);
        c.fillRect(x + 12 * k.d, y + 34 * k.d, w * .7, 4 * k.d);
        c.fillRect(x + 12 * k.d, y + 46 * k.d, w * .6, 4 * k.d);
        c.beginPath(); c.arc(x + w - 18 * k.d, y + 20 * k.d, 7 * k.d, 0, 6.28);
        c.fillStyle = rgba(COL.ok, .5 + .4 * wave); c.fill();
      });
      c.globalAlpha = 1;
    };
    make(); resize();
    addEventListener('resize', resize);
    new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(canvas);
    if (!reduced) requestAnimationFrame(draw);
    else { visible = true; draw(0); visible = false; }
  }

  /* ==========================================================================
     Boot
     ========================================================================== */
  const film = new Film($('.hero__canvas'));
  film.init();
  new IntersectionObserver(e => { film.visible = e[0].isIntersecting; }, { rootMargin: '100px' }).observe($('.hero__stage'));
  ctaField($('.cta__canvas'));

  let lastW = innerWidth;
  addEventListener('resize', () => { film.resize(); });

  setupStatic();

  if (!hasGSAP) {
    // Offline fallback: no animation library — show everything, autoplay film.
    document.body.classList.remove('is-loading');
    $('.preloader').remove();
    $$('[data-count]').forEach(el => { el.textContent = (+el.dataset.count).toFixed(+el.dataset.decimals || 0) + (el.dataset.suffix || ''); });
    $$('.spec__status').forEach(el => { el.textContent = '✓ ' + el.dataset.status; el.classList.add('is-ok'); });
    $$('.score').forEach(s => s.style.setProperty('--s', s.dataset.score / 5));
    const auto = now => { film.setProgress(((now / 1000) / 30) % 1); requestAnimationFrame(auto); };
    requestAnimationFrame(auto);
    return;
  }

  document.documentElement.classList.add('js');
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Lenis ---------- */
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ lerp: .09, smoothWheel: true, syncTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const scrollTo = target => {
    if (lenis) lenis.scrollTo(target, { duration: 1.4, offset: 0 });
    else if (typeof target === 'number') window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };
  $$('[data-scroll-to]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (!id || !id.startsWith('#')) return;
    e.preventDefault();
    if (id === '#top') return scrollTo(0);
    const el = $(id);
    if (!el) return;
    // pinned sections: scroll to the pin spacer start
    const st = ScrollTrigger.getAll().find(s => s.trigger === el && s.pin);
    scrollTo(st ? st.start + 1 : el);
  }));

  /* ---------- Splits ---------- */
  const splitEls = $$('[data-split="lines"]');
  const sceneEls = $$('.hero__scene');
  const sceneChars = sceneEls.map(el => splitChars(el));

  /* ---------- Hero scroll film ---------- */
  function buildHero() {
    const intro = $('.hero__intro');
    const hud = { n: $('.js-scene-n'), name: $('.js-scene-name'), tc: $('.js-tc'), bar: $('.js-hud-bar') };
    const names = ['Question', 'Review', 'Verified'];
    const proxy = { p: 0 };
    const updateHud = p => {
      const s = Math.min(2, Math.floor(p * 3));
      hud.n.textContent = '0' + (s + 1);
      hud.name.textContent = names[s];
      const secs = p * 30, f = Math.floor((secs % 1) * 24);
      hud.tc.textContent = `00:00:${String(Math.floor(secs)).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
      hud.bar.style.transform = `scaleY(${p})`;
    };

    if (reduced) { film.setProgress(.12); return; }

    gsap.set(sceneEls, { opacity: 1 });
    gsap.set(sceneChars.flat(), { yPercent: 110, opacity: 0 });

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.hero', start: 'top top',
        end: () => '+=' + innerHeight * (isMobile() ? 2.6 : 4),
        pin: true, scrub: .6, anticipatePin: 1, invalidateOnRefresh: true,
      },
    });
    tl.to(proxy, { p: 1, duration: 1, onUpdate: () => { film.setProgress(proxy.p); updateHud(proxy.p); } }, 0);
    tl.to(intro, { opacity: 0, y: -60, filter: 'blur(8px)', duration: .06 }, .005);
    tl.to('.hero__hint', { opacity: 0, duration: .03 }, 0);

    const sceneIn = [.24, .44, .76], sceneOut = [.31, .62, .86];
    sceneChars.forEach((chars, i) => {
      tl.to(chars, { yPercent: 0, opacity: 1, duration: .05, stagger: .05 / chars.length, ease: 'power2.out' }, sceneIn[i]);
      tl.to(chars, { yPercent: -60, opacity: 0, filter: 'blur(6px)', duration: .04, stagger: .02 / chars.length, ease: 'power2.in' }, sceneOut[i]);
    });
    // Scene 1 copy appears early: the question is typing in behind it.
    tl.addLabel('end', 1);
    tl.fromTo('.hero__lockup', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .07, ease: 'power2.out' }, .91);
    tl.set({}, {}, 1);
  }

  /* ---------- Intro (after preloader) ---------- */
  function introAnim() {
    const title = $('.hero__title');
    const lines = splitLines(title);
    title._revealed = true;
    const tl = gsap.timeline();
    tl.from(lines, { yPercent: 110, duration: 1.3, stagger: .09, ease: 'expo.out' }, 0)
      .from('.hero__sub, .hero__ctas', { opacity: 0, y: 24, duration: 1, stagger: .1, ease: 'expo.out' }, .35)
      .from('.nav', { yPercent: -100, opacity: 0, duration: 1, ease: 'expo.out' }, .2)
      .from('.hud', { opacity: 0, duration: 1 }, .6);
    const eb = $('.hero .eyebrow');
    decode(eb, eb.textContent, .9);
  }

  /* ---------- Preloader ---------- */
  function preload() {
    const pre = $('.preloader');
    const countEl = $('.js-count', pre);
    const bar = $('.preloader__bar span', pre);
    const checks = $$('.preloader__checks li', pre);
    const o = { v: 0 };
    const setV = () => {
      const v = Math.round(o.v);
      countEl.textContent = String(v).padStart(3, '0');
      bar.style.transform = `scaleX(${o.v / 100})`;
      checks.forEach((li, i) => li.classList.toggle('is-ok', v >= (i + 1) * 25));
    };
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    const minTime = new Promise(r => setTimeout(r, reduced ? 200 : 1300));
    gsap.to(o, { v: 86, duration: reduced ? .2 : 1.4, ease: 'power2.out', onUpdate: setV });
    Promise.race([Promise.all([fonts, minTime]), new Promise(r => setTimeout(r, 4000))]).then(() => {
      gsap.to(o, {
        v: 100, duration: .45, ease: 'power2.inOut', onUpdate: setV,
        onComplete() {
          film.wrapCache.clear();
          gsap.to(pre, {
            clipPath: 'inset(0 0 100% 0)', duration: reduced ? .01 : 1.1, ease: 'expo.inOut',
            onComplete() { pre.remove(); },
          });
          document.body.classList.remove('is-loading');
          if (lenis) lenis.start();
          init();
          if (!reduced) introAnim(); else splitLines($('.hero__title'));
          ScrollTrigger.refresh();
        },
      });
    });
  }

  /* ---------- Everything scroll-driven ---------- */
  function init() {
    buildHero();

    // Line reveals
    splitEls.filter(el => !el.classList.contains('hero__title')).forEach(el => {
      const lines = splitLines(el);
      if (reduced) return;
      gsap.set(lines, { yPercent: 110 });
      ScrollTrigger.create({
        trigger: el, start: 'top 86%', once: true,
        onEnter() { el._revealed = true; gsap.to($$('.ln > span', el), { yPercent: 0, duration: 1.2, stagger: .08, ease: 'expo.out' }); },
      });
    });

    // Decode tags
    $$('[data-decode]').filter(el => !el.closest('.hero')).forEach(el => {
      const txt = el.textContent;
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => decode(el, txt) });
    });

    // Generic reveals
    const mm = gsap.matchMedia();
    const reveal = sel => ScrollTrigger.batch(sel, {
      start: 'top 90%', once: true,
      onEnter: b => {
        b.forEach(el => el.classList.add('is-in'));
        gsap.to(b, { opacity: 1, y: 0, duration: 1.1, stagger: .08, ease: 'expo.out', overwrite: true });
      },
    });
    if (reduced) gsap.set('[data-reveal]', { opacity: 1, y: 0, onComplete() { $$('[data-reveal]').forEach(e => e.classList.add('is-in')); } });
    else reveal('[data-reveal]:not(.pillar)');

    // Stats
    $$('[data-count]').forEach(el => {
      const end = +el.dataset.count, dec = +el.dataset.decimals || 0, suf = el.dataset.suffix || '';
      const fmt = v => v.toFixed(dec) + suf;
      if (reduced) { el.textContent = fmt(end); el.parentElement.classList.add('is-in'); return; }
      const o = { v: 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 92%', once: true,
        onEnter() {
          el.parentElement.classList.add('is-in');
          gsap.to(o, { v: end, duration: 1.8, ease: 'expo.out', onUpdate: () => { el.textContent = fmt(o.v); } });
        },
      });
    });

    // Mission — scroll-lit words
    const mission = $('[data-light]');
    const words = splitWordsDeep(mission);
    $$('em[data-check]', mission).forEach(em => { const ws = $$('.w', em); const s = document.createElement('span'); s.className = 'chk'; s.textContent = '✓'; s.setAttribute('aria-hidden', 'true'); ws[ws.length - 1].appendChild(s); });
    if (!reduced) {
      gsap.set(words, { opacity: .14 });
      const mtl = gsap.timeline({ scrollTrigger: { trigger: mission, start: 'top 78%', end: 'bottom 42%', scrub: .5 } });
      words.forEach((w, i) => mtl.to(w, { opacity: 1, duration: 1, ease: 'none' }, i * .5));
      $$('em[data-check]', mission).forEach(em => {
        const ws = $$('.w', em); const last = words.indexOf(ws[ws.length - 1]);
        mtl.to($('.chk', em), { scale: 1, duration: .8, ease: 'back.out(3)' }, last * .5 + .6);
      });
    } else $$('.chk', mission).forEach(c => (c.style.transform = 'scale(1)'));

    // Pillars
    mm.add({ desk: '(min-width: 768px)', mob: '(max-width: 767px)' }, ctx => {
      const { desk } = ctx.conditions;
      if (reduced) { gsap.set('.pillar', { opacity: 1, y: 0 }); return; }
      if (desk) {
        const track = $('.pillars__track');
        const dist = () => Math.max(0, track.scrollWidth - innerWidth);
        gsap.set('.pillar', { opacity: 1, y: 0 });
        gsap.to(track, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: { trigger: '.pillars', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .8, invalidateOnRefresh: true, anticipatePin: 1 },
        });
        gsap.from('.pillar', { x: 120, opacity: 0, duration: 1.2, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: '.pillars', start: 'top 60%', once: true } });
      } else {
        reveal('.pillar');
      }
    });
    gsap.from('.rubric__row b', { scaleX: 0, duration: 1.4, stagger: .15, ease: 'expo.out', scrollTrigger: { trigger: '.pillars', start: 'top 30%', once: true } });

    // Story — paper wipe + timeline + cursor on light
    if (!reduced) {
      gsap.fromTo('.story__paper', { clipPath: 'inset(6% 3% 0% 3% round 40px)' }, {
        clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
        scrollTrigger: { trigger: '.story', start: 'top bottom', end: 'top 15%', scrub: true },
      });
      gsap.to('.timeline__line span', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 70%', end: 'bottom 70%', scrub: true } });
    } else gsap.set('.timeline__line span', { scaleY: 1 });
    ScrollTrigger.create({ trigger: '.story__paper', start: 'top 50%', end: 'bottom 50%', toggleClass: { targets: '.cursor', className: 'on-light' } });

    // Credentials decode
    ScrollTrigger.batch('.spec', {
      start: 'top 88%', once: true,
      onEnter: b => b.forEach((el, i) => setTimeout(() => {
        const st = $('.spec__status', el);
        decode(st, '✓ ' + st.dataset.status.toUpperCase(), .6);
        setTimeout(() => st.classList.add('is-ok'), 600);
      }, 300 + i * 140)),
    });

    // Sample evaluation scores
    ScrollTrigger.create({
      trigger: '.scorecard', start: 'top 85%', once: true,
      onEnter: () => $$('.score').forEach((s, i) => setTimeout(() => { s.style.setProperty('--s', s.dataset.score / 5); if (+s.dataset.score <= 2) s.setAttribute('data-low', ''); }, i * 120)),
    });

    // CTA
    ScrollTrigger.create({ trigger: '.cta', start: 'top 55%', once: true, onEnter: () => $('.cta').classList.add('is-in') });

    // Footer word parallax
    if (!reduced) gsap.from('.footer__word', { yPercent: 40, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

    // Nav: hide/show, scrolled, progress, active
    const nav = $('[data-nav]');
    const prog = $('.progress span');
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate(self) {
        const y = self.scroll();
        nav.classList.toggle('is-scrolled', y > 40);
        nav.classList.toggle('is-hidden', self.direction === 1 && y > 300);
        prog.style.transform = `scaleX(${self.progress})`;
      },
    });
    const links = $$('.nav__links a');
    ['mission', 'pillars', 'story', 'credentials', 'evidence'].forEach(id => {
      ScrollTrigger.create({
        trigger: '#' + id, start: 'top 50%', end: 'bottom 50%',
        onToggle: self => {
          const mine = links.find(a => a.getAttribute('href') === '#' + id);
          if (self.isActive) links.forEach(a => a.classList.toggle('is-active', a === mine));
          else mine && mine.classList.remove('is-active');
        },
      });
    });

    // Badge physics
    badge();

    // Re-split on width change
    let rt;
    addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        if (Math.abs(innerWidth - lastW) < 2) return;
        lastW = innerWidth;
        splitEls.forEach(el => {
          const lines = splitLines(el);
          if (!el._revealed && !reduced && !el.classList.contains('hero__title')) gsap.set(lines, { yPercent: 110 });
        });
        ScrollTrigger.refresh();
      }, 250);
    });
  }

  /* ---------- Lanyard badge pendulum ---------- */
  function badge() {
    const wrap = $('.lanyard-wrap');
    const lan = $('.lanyard');
    let ang = 0, vel = 0, dragging = false, lastAng = 0;
    gsap.ticker.add((time) => {
      if (!dragging) {
        const sv = lenis ? clamp(lenis.velocity, -60, 60) : 0;
        const idle = reduced ? 0 : Math.sin(time * 1.1) * .25;
        const acc = -.035 * (ang - idle) - .07 * vel + sv * .012;
        vel += acc; ang += vel;
      }
      ang = clamp(ang, -40, 40);
      lan.style.transform = `rotate(${ang.toFixed(3)}deg)`;
    });
    if (!finePointer) return;
    const toAngle = e => {
      const r = wrap.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = Math.max(40, e.clientY - r.top);
      return clamp(-Math.atan2(dx, dy) * 180 / Math.PI, -40, 40);
    };
    lan.addEventListener('pointerdown', e => { dragging = true; lan.setPointerCapture(e.pointerId); lastAng = ang; lan.style.cursor = 'grabbing'; });
    lan.addEventListener('pointermove', e => { if (!dragging) return; const a = toAngle(e); vel = (a - ang) * .5; lastAng = ang; ang = lerp(ang, a, .35); });
    const end = () => { if (!dragging) return; dragging = false; vel = (ang - lastAng); lan.style.cursor = ''; };
    lan.addEventListener('pointerup', end);
    lan.addEventListener('pointercancel', end);
  }

  /* ==========================================================================
     Static interactions (work with or without GSAP)
     ========================================================================== */
  function setupStatic() {
    // LinkedIn
    $$('[data-linkedin]').forEach(a => {
      if (CONFIG.linkedin) a.href = CONFIG.linkedin;
      else a.addEventListener('click', e => { e.preventDefault(); toast('LinkedIn link coming soon — email me instead'); });
    });

    // CV availability
    const cvLinks = $$('[data-cv]');
    let cvMissing = false;
    if (location.protocol.startsWith('http')) {
      fetch(cvLinks[0].getAttribute('href'), { method: 'HEAD' }).then(r => { cvMissing = !r.ok; }).catch(() => { cvMissing = true; });
    }
    cvLinks.forEach(a => a.addEventListener('click', e => {
      if (cvMissing) { e.preventDefault(); toast('CV coming soon — email me for a copy'); }
    }));

    // Copy email
    const copy = $('.js-copy');
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(copy.dataset.email); toast('✓ Copied to clipboard'); }
      catch (e) { location.href = 'mailto:' + copy.dataset.email; }
    });

    // Clock (WIB)
    const clock = $('.js-clock');
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const tick = () => { clock.textContent = fmt.format(new Date()); };
    tick(); setInterval(tick, 1000);

    // Language flip
    const lb = $('.langflip__btn'), lt = $('.langflip__text');
    lb.addEventListener('click', () => {
      const on = lb.getAttribute('aria-pressed') !== 'true';
      lb.setAttribute('aria-pressed', String(on));
      const next = on ? lt.dataset.id : lt.dataset.en;
      lt.setAttribute('lang', on ? 'id' : 'en');
      if (window.gsap && !reduced) gsap.timeline().to(lt, { opacity: 0, y: -8, duration: .2 }).add(() => { lt.textContent = next; }).fromTo(lt, { y: 8 }, { opacity: 1, y: 0, duration: .35, ease: 'expo.out' });
      else lt.textContent = next;
    });

    // Sample evaluation notes
    const card = $('.evalcard');
    const note = $('.note', card);
    let pinned = null;
    const show = btn => {
      note.textContent = btn.dataset.note;
      note.dataset.kind = btn.classList.contains('ann--flag') ? 'flag' : btn.classList.contains('ann--miss') ? 'miss' : 'ok';
      note.hidden = false;
      $$('.ann', card).forEach(b => b.classList.toggle('is-active', b === btn));
      if (innerWidth >= 768) {
        const cr = card.getBoundingClientRect();
        const rects = btn.getClientRects();
        const r = rects[rects.length - 1] || btn.getBoundingClientRect();
        let left = r.left - cr.left;
        const maxLeft = cr.width - Math.min(340, note.offsetWidth) - 16;
        left = clamp(left, 16, Math.max(16, maxLeft));
        note.style.left = left + 'px';
        note.style.top = (r.bottom - cr.top + 10) + 'px';
      } else { note.style.left = ''; note.style.top = ''; }
    };
    const hide = () => { if (pinned) return; note.hidden = true; $$('.ann', card).forEach(b => b.classList.remove('is-active')); };
    $$('.ann', card).forEach(btn => {
      btn.addEventListener('mouseenter', () => { if (!pinned) show(btn); });
      btn.addEventListener('mouseleave', hide);
      btn.addEventListener('focus', () => show(btn));
      btn.addEventListener('blur', () => { pinned = null; hide(); });
      btn.addEventListener('click', () => { if (pinned === btn) { pinned = null; hide(); } else { pinned = btn; show(btn); } });
    });
    document.addEventListener('click', e => { if (pinned && !e.target.closest('.ann')) { pinned = null; hide(); } });

    // Corrected answer toggle
    const fixBtn = $('.js-fix');
    const sample = $('.sample');
    fixBtn.addEventListener('click', () => {
      const fixed = card.dataset.state !== 'fixed';
      card.dataset.state = fixed ? 'fixed' : 'review';
      sample.classList.toggle('is-fixed', fixed);
      pinned = null; note.hidden = true;
      $('span', fixBtn).textContent = fixed ? 'Show original review' : 'Show corrected answer';
      $$('.score').forEach(s => {
        const v = fixed ? +s.dataset.fixed : +s.dataset.score;
        s.style.setProperty('--s', v / 5);
        $('em', s).textContent = v + '/5';
        if (v <= 2) s.setAttribute('data-low', ''); else s.removeAttribute('data-low');
      });
      if (window.gsap && !reduced) gsap.fromTo(card.querySelector(fixed ? '.evalcard__answer--fixed' : '.evalcard__answer--review'), { opacity: 0, y: 12, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: .8, ease: 'expo.out' });
    });

    // Cursor + magnetic (desktop)
    if (finePointer && !reduced) {
      document.body.classList.add('has-cursor');
      const cur = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring'), label = $('.cursor__label');
      let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
      addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px, ${my}px)`; }, { passive: true });
      const step = () => { rx = lerp(rx, mx, .18); ry = lerp(ry, my, .18); ring.style.transform = `translate(${rx}px, ${ry}px)`; requestAnimationFrame(step); };
      requestAnimationFrame(step);
      document.addEventListener('pointerover', e => {
        const lbl = e.target.closest('[data-cursor]');
        const hov = e.target.closest('a, button');
        cur.classList.toggle('is-label', !!lbl);
        cur.classList.toggle('is-hover', !!hov && !lbl);
        label.textContent = lbl ? lbl.dataset.cursor : '';
      });
      document.addEventListener('pointerleave', () => cur.style.opacity = '0');
      document.addEventListener('pointerenter', () => cur.style.opacity = '1');

      if (window.gsap) $$('[data-magnetic]').forEach(el => {
        el.addEventListener('pointermove', e => {
          const r = el.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
          gsap.to(el, { x: clamp(dx * .25, -12, 12), y: clamp(dy * .35, -12, 12), duration: .6, ease: 'power3.out' });
        });
        el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: .9, ease: 'elastic.out(1, .4)' }));
      });
    }
  }

  preload();
})();
