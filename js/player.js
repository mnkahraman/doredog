/* ============================================================================
   DoReDog — Letter Notes Engine
   Parser + Web-Audio piano + interactive player (transport · scrolling score ·
   persistent right-side stage with a cinematic keyboard visualizer).

   Public API:
     DRD.createPlayer(mountEl, song, opts)
     DRD.parseNotation(text) · DRD.buildTimeline(blocks) · DRD.noteToMidi · DRD.Synth
   ========================================================================== */
(function (global) {
  'use strict';

  /* ----------------------------- note maths ------------------------------ */
  const NATURAL = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  const SHARP = { C: 1, D: 3, F: 6, G: 8, A: 10 };
  const OCT_HEX = { 2: '#ff54b2', 3: '#35e08c', 4: '#ff5f64', 5: '#f6b73f', 6: '#4fa3ff' };
  const clampOct = (o) => Math.max(2, Math.min(6, o));

  function noteToMidi(letter, octave) {
    let semi;
    if (Object.prototype.hasOwnProperty.call(SHARP, letter)) semi = SHARP[letter];
    else { const lc = letter.toLowerCase(); if (!Object.prototype.hasOwnProperty.call(NATURAL, lc)) return null; semi = NATURAL[lc]; }
    return (octave + 1) * 12 + semi;
  }
  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const isNoteChar = (ch) => ch && ch !== '-' && ch !== ' ' &&
    (Object.prototype.hasOwnProperty.call(SHARP, ch) || Object.prototype.hasOwnProperty.call(NATURAL, ch.toLowerCase()));

  /* ------------------------------ parser --------------------------------- */
  function parseNotation(text) {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    const blocks = []; let cur = [];
    const flush = () => { if (cur.length) { blocks.push(cur); cur = []; } };
    for (const raw of lines) {
      const line = raw.replace(/\s+$/, ''); const t = line.trim();
      if (t === '') { flush(); continue; }
      if (/^\d+$/.test(t)) { flush(); continue; }
      const m = line.match(/^\s*(RH|LH|R|L)?\s*(\d+)\s*\|(.*)$/i);
      if (m) {
        const hand = m[1] ? (m[1][0].toUpperCase() === 'R' ? 'R' : 'L') : null;
        const content = m[3].replace(/\|\s*$/, '');
        cur.push({ octave: parseInt(m[2], 10), content, hand: hand });
      }
    }
    flush();
    return blocks;
  }

  function buildTimeline(blocks) {
    const cols = []; const blockMeta = []; let start = 0;
    blocks.forEach((block, bi) => {
      const width = block.reduce((w, l) => Math.max(w, l.content.length), 0);
      for (let c = 0; c < width; c++) {
        const events = [];
        for (const line of block) {
          const ch = line.content[c];
          if (isNoteChar(ch)) { const midi = noteToMidi(ch, line.octave); if (midi != null) events.push({ midi, octave: line.octave, letter: ch, hand: line.hand }); }
        }
        cols.push({ events, blockIndex: bi, colInBlock: c });
      }
      blockMeta.push({ index: bi, start, width }); start += width;
    });
    return { cols, blockMeta, total: cols.length };
  }

  // Transpose the parsed blocks by `semi` semitones for DISPLAY (letters + octave lines change; column
  // layout/timing is preserved so the playhead still tracks). Audio is shifted separately at schedule time.
  const SEMI_LETTER = ['c', 'C', 'd', 'D', 'e', 'f', 'F', 'g', 'G', 'a', 'A', 'b'];
  function transposeBlocks(blocks, semi) {
    if (!semi) return blocks;
    return blocks.map((block) => {
      const width = block.reduce((w, l) => Math.max(w, l.content.length), 0);
      const groups = {}, order = [];   // key "hand|octave" -> array of voice char-arrays
      for (const line of block) {
        for (let c = 0; c < width; c++) {
          const ch = line.content[c]; if (!isNoteChar(ch)) continue;
          const midi = noteToMidi(ch, line.octave); if (midi == null) continue;
          const nm = midi + semi, noct = Math.floor(nm / 12) - 1, nlet = SEMI_LETTER[((nm % 12) + 12) % 12];
          const key = (line.hand || 'X') + '|' + noct;
          if (!groups[key]) { groups[key] = []; order.push({ key: key, hand: line.hand, octave: noct }); }
          let placed = false;
          for (const vch of groups[key]) { if (!vch[c]) { vch[c] = nlet; placed = true; break; } }
          if (!placed) { const vch = new Array(width); vch[c] = nlet; groups[key].push(vch); }
        }
      }
      order.sort((a, b) => { const ha = a.hand === 'R' ? 0 : a.hand === 'L' ? 1 : 2, hb = b.hand === 'R' ? 0 : b.hand === 'L' ? 1 : 2; return ha - hb || b.octave - a.octave; });
      const out = [];
      for (const g of order) for (const vch of groups[g.key]) {
        let content = ''; for (let c = 0; c < width; c++) content += vch[c] || '-';
        out.push({ octave: g.octave, hand: g.hand, content: content });
      }
      return out.length ? out : block;
    });
  }

  /* ------------------------------ synth ---------------------------------- */
  // ---- 10 selectable voices. Each is a small synthesis recipe: harmonic partials (timbre), an optional
  //      sub-octave (body), an octave-up "shimmer" sine (sparkle — the main source of "ringing", so most
  //      voices dial it down), a detuned twin (width), a lowpass sweep, and an amp envelope (piano-style
  //      decay, or organ/pad-style sustain). 'grand' reproduces the original default exactly.
  const VOICES = [
    { id: 'grand', name: 'Grand piano', partials: [0, 1, .55, .36, .22, .16, .10, .08, .05, .04, .03, .02, .015, .01, .008, .006],
      sub: 0, detune: 0, shimmer: .22, shimmerMul: 2, shimmerDur: .9, atk: .006, dec: .5, sus: .3, rel: 2.6, dur: 2.6, sustained: false,
      fStart: (f) => Math.min(f * 7 + 2000, 12000), fEnd: (f) => Math.max(f * 2, 700), fTime: 1.2, rvb: 1.0, gain: .26 },
    { id: 'natural', name: 'Natural piano', partials: [0, 1, .5, .26, .14, .08, .045, .028, .017, .01, .006],
      sub: .06, detune: 0, shimmer: .06, shimmerMul: 2, shimmerDur: .5, atk: .005, dec: .55, sus: .26, rel: 2.4, dur: 2.6, sustained: false,
      fStart: (f) => Math.min(f * 5 + 1400, 9000), fEnd: (f) => Math.max(f * 1.8, 600), fTime: 1.1, rvb: .7, gain: .28 },
    { id: 'warm', name: 'Warm & full', partials: [0, 1, .42, .24, .12, .06, .03, .015],
      sub: .34, detune: 0, shimmer: 0, shimmerMul: 2, shimmerDur: 0, atk: .008, dec: .6, sus: .32, rel: 2.6, dur: 2.8, sustained: false,
      fStart: (f) => Math.min(f * 4 + 1100, 7000), fEnd: (f) => Math.max(f * 1.6, 520), fTime: 1.3, rvb: .8, gain: .3 },
    { id: 'soft', name: 'Soft & mellow', partials: [0, 1, .34, .15, .06, .025, .01],
      sub: .1, detune: 0, shimmer: .03, shimmerMul: 2, shimmerDur: .4, atk: .022, dec: .5, sus: .24, rel: 2.2, dur: 2.4, sustained: false,
      fStart: (f) => Math.min(f * 3.5 + 800, 5500), fEnd: (f) => Math.max(f * 1.4, 440), fTime: 1.0, rvb: .65, gain: .28 },
    { id: 'celestial', name: 'Celestial', partials: [0, 1, .5, .26, .34, .13, .16, .06, .09, .04],
      sub: 0, detune: 7, shimmer: .09, shimmerMul: 3, shimmerDur: 1.0, atk: .09, dec: .35, sus: .5, rel: 1.1, dur: 2.1, sustained: true,
      fStart: (f) => Math.min(f * 3.5 + 1600, 7500), fEnd: (f) => Math.min(f * 4 + 1800, 8000), fTime: 1.3, rvb: 1.05, gain: .22 },
    { id: 'march', name: 'March / brass', partials: [0, 1, .72, .52, .4, .3, .22, .16, .11, .07, .04],
      sub: .16, detune: 4, shimmer: 0, shimmerMul: 2, shimmerDur: 0, atk: .004, dec: .28, sus: .36, rel: 1.2, dur: 1.5, sustained: false,
      fStart: (f) => Math.min(f * 8 + 2500, 12000), fEnd: (f) => Math.max(f * 4, 1600), fTime: .5, rvb: .35, gain: .24 },
    { id: 'organ', name: 'Organ', partials: [0, 1, .5, .78, .58, .22, .5, .1, .44, 0, 0, 0, .3, 0, 0, 0, .18],
      sub: .24, detune: 0, shimmer: 0, shimmerMul: 2, shimmerDur: 0, atk: .009, dec: .035, sus: .84, rel: .13, dur: 1.4, sustained: true,
      fStart: (f) => Math.min(f * 7 + 2400, 11000), fEnd: (f) => Math.min(f * 7 + 2400, 11000), fTime: .15, rvb: .55, gain: .19 },
    { id: 'rhodes', name: 'Electric piano', partials: [0, 1, .08, .03, .22, .01, .05, .005, .02],
      sub: .08, detune: 0, shimmer: .16, shimmerMul: 4, shimmerDur: .35, atk: .005, dec: .7, sus: .22, rel: 2.0, dur: 2.2, sustained: false,
      fStart: (f) => Math.min(f * 5 + 1200, 8000), fEnd: (f) => Math.max(f * 1.6, 500), fTime: 1.0, rvb: .6, gain: .3 },
    { id: 'harpsichord', name: 'Harpsichord', partials: [0, 1, .8, .62, .5, .42, .34, .28, .22, .17, .12, .08],
      sub: 0, detune: 6, shimmer: 0, shimmerMul: 2, shimmerDur: 0, atk: .002, dec: .18, sus: .04, rel: .7, dur: 1.1, sustained: false,
      fStart: (f) => Math.min(f * 9 + 2500, 13000), fEnd: (f) => Math.max(f * 5, 1800), fTime: .5, rvb: .4, gain: .22 },
    { id: 'musicbox', name: 'Music box', partials: [0, 1, .02, .35, .02, .14, .01, .07, .04],
      sub: 0, detune: 0, shimmer: .2, shimmerMul: 2, shimmerDur: 1.2, atk: .002, dec: .35, sus: .02, rel: 1.5, dur: 1.7, sustained: false,
      fStart: (f) => Math.min(f * 8 + 2000, 12000), fEnd: (f) => Math.max(f * 3, 1200), fTime: .9, rvb: 1.0, gain: .22 }
  ];
  const VOICES_BY_ID = {}; VOICES.forEach((v) => (VOICES_BY_ID[v.id] = v));

  const Synth = {
    ctx: null, master: null, reverb: null, reverbGain: null, ready: false,
    _active: [], MAXVOICES: 28,   // hard polyphony cap — bounds live oscillators so dense/fast pieces + heavy voices never overload the audio thread (stealing the oldest, already-decayed note is inaudible)
    voiceId: (function () { try { return (global.localStorage && localStorage.getItem('drd-voice')) || 'grand'; } catch (e) { return 'grand'; } })(),
    get voice() { return VOICES_BY_ID[this.voiceId] || VOICES[0]; },
    setVoice(id) { if (VOICES_BY_ID[id]) { this.voiceId = id; try { if (global.localStorage) localStorage.setItem('drd-voice', id); } catch (e) {} } },
    ensure() {
      if (this.ready && this.ctx && this.ctx.state !== 'closed') { this._kick(); return; }
      const AC = global.AudioContext || global.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.85; this.master.connect(this.ctx.destination);
      // Convolution reverb runs continuously and is the single biggest sustained audio-thread cost —
      // the main reason a long piece heats the phone. On mobile use a much shorter impulse (~4x cheaper
      // convolution) and a lower send; the ambient tail is barely audible on a phone speaker anyway.
      this.reverb = this.ctx.createConvolver(); this.reverb.buffer = this._impulse(MOBILE ? 0.6 : 2.6, MOBILE ? 3.2 : 2.4);
      this.reverbGain = this.ctx.createGain(); this.reverbGain.gain.value = MOBILE ? 0.13 : 0.20;
      this.reverb.connect(this.reverbGain); this.reverbGain.connect(this.master);
      for (const V of VOICES) {
        const p = V.partials, real = new Float32Array(p.length), imag = new Float32Array(p.length);
        for (let i = 0; i < p.length; i++) real[i] = p[i];
        V._wave = this.ctx.createPeriodicWave(real, imag);
      }
      this.ready = true;
      this._kick();
    },
    // resume + play a 1-sample silent buffer — Safari/iOS won't start audio until this happens inside a gesture
    _kick() {
      if (!this.ctx) return;
      if (this.ctx.state !== 'running') { try { this.ctx.resume(); } catch (e) {} }
      try { const s = this.ctx.createBufferSource(); s.buffer = this.ctx.createBuffer(1, 1, 22050); s.connect(this.ctx.destination); s.start(0); } catch (e) {}
    },
    _impulse(dur, decay) {
      const rate = this.ctx.sampleRate, len = Math.floor(rate * dur), buf = this.ctx.createBuffer(2, len, rate);
      for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
      return buf;
    },
    // Cancel any pending automation first (e.g. a leftover pagehide fade-to-0): a plain `.value =` does NOT
    // clear scheduled ramps, so the gain would stay stuck at the fade's target → silence. This is the
    // "Safari has no sound" bug. cancel + setValueAtTime forces the volume to actually take.
    setVolume(v) {
      if (!this.master) return;
      const g = this.master.gain;
      if (this.ctx) { const t = this.ctx.currentTime; try { g.cancelScheduledValues(t); g.setValueAtTime(v, t); return; } catch (e) {} }
      g.value = v;
    },
    // short metronome click. accent=true → louder/higher downbeat.
    tick(when, accent) {
      this.ensure();
      const t = when != null ? when : this.ctx.currentTime;
      const o = this.ctx.createOscillator(); o.type = 'square'; o.frequency.value = accent ? 2000 : 1350;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.3, t + 0.001);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.06);
    },
    note(freq, when, velocity) {
      this.ensure();
      const V = this.voice, t = when != null ? when : this.ctx.currentTime, v = velocity == null ? 0.9 : velocity;
      const peak = V.gain * v, flr = 0.0002;
      // High notes (octave 5–6) "ring"/pierce, mostly from the octave-up shimmer sine + bright reverb tail.
      // Taper both toward the top: full up to ~C5 (523Hz), down to ~0.4 by C6 (1046Hz) and above.
      const highMul = Math.min(1, Math.max(0.4, 1 - (Math.log2(freq) - 9.02) * 0.6));
      const g = this.ctx.createGain();
      const filt = this.ctx.createBiquadFilter(); filt.type = 'lowpass';
      filt.frequency.setValueAtTime(V.fStart(freq), t);
      filt.frequency.exponentialRampToValueAtTime(Math.max(V.fEnd(freq), 180), t + V.fTime);
      filt.connect(g);
      const all = [], down = [filt, g];   // `down` = this note's gain/filter/send nodes; disconnected on note end so they don't pile up on the master bus
      const main = this.ctx.createOscillator(); main.setPeriodicWave(V._wave); main.frequency.value = freq; main.connect(filt); all.push(main);
      if (V.detune && !MOBILE) { const o2 = this.ctx.createOscillator(); o2.setPeriodicWave(V._wave); o2.frequency.value = freq; o2.detune.value = V.detune; o2.connect(filt); all.push(o2); }   // skip the detuned-twin "width" oscillator on mobile (halves osc count, inaudible on a phone speaker)
      if (V.sub) { const os = this.ctx.createOscillator(); os.type = 'sine'; os.frequency.value = freq / 2; const sg = this.ctx.createGain(); sg.gain.value = V.sub; os.connect(sg); sg.connect(filt); all.push(os); down.push(sg); }
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + V.atk);
      if (V.sustained) {
        g.gain.exponentialRampToValueAtTime(Math.max(peak * V.sus, flr), t + V.atk + V.dec);
        g.gain.setValueAtTime(Math.max(peak * V.sus, flr), t + Math.max(V.atk + V.dec + 0.01, V.dur - V.rel));
        g.gain.exponentialRampToValueAtTime(0.0001, t + V.dur);
      } else {
        g.gain.exponentialRampToValueAtTime(Math.max(peak * V.sus, flr), t + V.dec);
        g.gain.exponentialRampToValueAtTime(0.0001, t + V.dur);
      }
      g.connect(this.master);
      if (V.rvb > 0 && this.reverb) { const rs = this.ctx.createGain(); rs.gain.value = V.rvb * (0.6 + 0.4 * highMul); g.connect(rs); rs.connect(this.reverb); down.push(rs); }
      const stopAt = t + V.dur + 0.08;
      for (const o of all) { o.start(t); o.stop(stopAt); }
      if (V.shimmer && !MOBILE) {   // skip the octave-up shimmer sine on mobile (extra osc + gain per note)
        const sh = this.ctx.createOscillator(); sh.type = 'sine'; sh.frequency.value = freq * (V.shimmerMul || 2);
        const g2 = this.ctx.createGain();
        g2.gain.setValueAtTime(0.0001, t);
        g2.gain.exponentialRampToValueAtTime(Math.max(peak * V.shimmer * highMul, 0.00005), t + V.atk + 0.002);
        g2.gain.exponentialRampToValueAtTime(0.0001, t + (V.shimmerDur || 0.9));
        sh.connect(g2); g2.connect(this.master);
        sh.start(t); sh.stop(t + (V.shimmerDur || 0.9) + 0.05); all.push(sh); down.push(g2);
      }
      // Release the whole per-note sub-graph when the note ends, so gain/filter/send nodes don't accumulate
      // on the master bus over a long piece — Web Audio keeps connected nodes alive, so without this they
      // pile up (memory bloat) and grow the audio-thread load, which is what builds the stutter toward the
      // end of a piece. Fires on the natural stop AND on a voice-steal stop().
      main.onended = function () {
        for (const nd of down) { try { nd.disconnect(); } catch (e) {} }
        for (const o of all) { try { o.disconnect(); } catch (e) {} }
      };
      // --- polyphony cap (voice-stealing) ---
      const now = this.ctx.currentTime;
      this._active = this._active.filter((grp) => grp.stopAt > now);   // drop notes that already finished
      let live = 0; for (const grp of this._active) if (grp.t <= now) live++;   // count only notes that have actually started
      while (live >= this.MAXVOICES) {
        const idx = this._active.findIndex((grp) => grp.t <= now);      // steal the OLDEST already-sounding note (nearly decayed → inaudible), never a future-scheduled one
        if (idx < 0) break;
        const old = this._active.splice(idx, 1)[0];
        for (const o of old.nodes) { try { o.stop(); } catch (e) {} }
        live--;
      }
      this._active.push({ nodes: all, t: t, stopAt: stopAt });
      return all;
    }
  };
  Synth.VOICES = VOICES;
  // pause (don't close!) the audio when leaving — closing breaks sound on bfcache return; ensure() resumes it.
  // Leaving mid-playback used to leak a brief burst of the look-ahead-scheduled notes (suspend() is async).
  // Click-free silence: fade the whole master bus to ~0 in 18ms — this silences the in-flight notes smoothly
  // before the page unloads. (Hard-stopping the oscillators with o.stop() truncates the waveform mid-cycle,
  // which pops/crackles on Safari — that was the residual "çıtırtı". A gain ramp has no discontinuity.)
  if (global.addEventListener) global.addEventListener('pagehide', () => {
    try {
      const ctx = Synth.ctx;
      if (ctx && Synth.master && ctx.state === 'running') {
        const g = Synth.master.gain, now = ctx.currentTime;
        if (Synth._preNavGain == null) Synth._preNavGain = g.value;   // remember the volume so a bfcache return restores it
        // ~8ms exponential fade to silence: fast enough that almost no audio leaks, still smooth enough to
        // avoid the mid-cycle discontinuity that pops on Safari. (Much shorter starts to risk a click again.)
        g.cancelScheduledValues(now); g.setValueAtTime(Math.max(g.value, 0.0001), now);
        g.exponentialRampToValueAtTime(0.00008, now + 0.008);
      }
      // halt each transport's scheduler (no new notes) but DON'T hard-stop oscillators — the bus fade silences them
      ALL_PLAYERS.forEach((p) => { try { if (p.playing && p.haltForNav) p.haltForNav(); } catch (e) {} });
      if (ctx && ctx.state === 'running') ctx.suspend();
    } catch (e) {}
  });
  // Safari auto-suspends the context when the tab is backgrounded — resume it on return so the next
  // play doesn't come back silent. Also undo the pagehide master-fade if this page is revived from bfcache.
  Synth._onReturn = function () {
    if (!Synth.ctx) return;
    if (Synth.ctx.state === 'suspended') { try { Synth.ctx.resume(); } catch (e) {} }
    if (Synth.master) {
      const g = Synth.master.gain, now = Synth.ctx.currentTime;
      try { g.cancelScheduledValues(now); } catch (e) {}     // always kill a leftover pagehide fade ramp
      // restore the saved volume; if none saved but the gain is stuck near-silent, bump it back to default
      const target = Synth._preNavGain != null ? Synth._preNavGain : (g.value < 0.02 ? 0.85 : g.value);
      try { g.setValueAtTime(target, now); } catch (e) { g.value = target; }
      Synth._preNavGain = null;
    }
  };
  if (global.document && global.document.addEventListener) {
    global.document.addEventListener('visibilitychange', () => { if (!global.document.hidden) Synth._onReturn(); });
  }
  if (global.addEventListener) global.addEventListener('pageshow', () => { Synth._onReturn(); });

  // Safari/iOS: unlock the audio context on the very FIRST real user gesture anywhere on the page,
  // so by the time the play button is pressed the context is already running (Safari won't start a
  // suspended context from a later gesture reliably). Self-removes once running.
  if (global.addEventListener && global.document) {
    const EVTS = ['pointerdown', 'touchend', 'mousedown', 'keydown'];
    const unlock = function () {
      Synth.ensure();
      Synth._onReturn();   // any real gesture also clears a stuck master fade → a silent page recovers on the next tap
      if (Synth.ctx && Synth.ctx.state === 'running') EVTS.forEach((e) => global.removeEventListener(e, unlock, true));
    };
    EVTS.forEach((e) => global.addEventListener(e, unlock, true));
  }

  /* ------------------------------ icons ---------------------------------- */
  const I = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    loop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
    vol: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>',
    restart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8"/><path d="M3 3v5h5"/></svg>',
    fs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>',
    learn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v9M8 12l-3-3M8 12l3-3M16 3v9M16 12l-3-3M16 12l3-3M4 21h16"/></svg>',
    present: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="15" rx="2"/><circle cx="12" cy="11.5" r="3" fill="currentColor" stroke="none"/></svg>'
  };
  const OCT_NAMES = { 2: 'Octave 2', 3: 'Octave 3', 4: 'Octave 4', 5: 'Octave 5', 6: 'Octave 6' };
  const WHITE = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];
  const BLACK = { 0: 'C', 1: 'D', 3: 'F', 4: 'G', 5: 'A' };
  const WHITE_W = 40, BLACK_W = 26;

  // Touch/phone devices get a lighter render path: capped canvas DPR, fewer particles, no canvas
  // shadowBlur, no full-canvas glow, a wider audio look-ahead, and instant (non-smooth) score
  // scrolling. Phones have far weaker GPUs, and the audio scheduler shares the main thread with
  // all this drawing — starving it is what makes long pieces stutter and playback go choppy.
  const MOBILE = (function () {
    try { return !!(global.matchMedia && (global.matchMedia('(pointer:coarse)').matches || (global.innerWidth || 9999) < 820)); }
    catch (e) { return false; }
  })();
  // Cap simultaneous voices harder on phones — dense passages otherwise pile up multi-oscillator notes
  // on the audio thread. Stealing the oldest (already-decaying) note is inaudible but keeps CPU/heat down.
  if (MOBILE) Synth.MAXVOICES = 12;

  /* --------------------------- visualizer -------------------------------- */
  // Lightweight canvas particle/glow system. Self-suspends when idle.
  function Visualizer(canvas, stage) {
    const ctx = canvas && canvas.getContext && canvas.getContext('2d');
    if (!ctx) return { hit() {}, resize() {}, stop() {}, destroy() {} };   // no-canvas / headless
    let dpr = 1, W = 0, H = 0, raf = 0, running = false;
    const parts = []; const rings = []; let glow = 0, glowColor = '139,107,255';
    // pre-rendered radial-glow sprite per colour — drawImage is far cheaper than per-particle shadowBlur
    const spriteCache = {};
    function sprite(rgb) {
      if (spriteCache[rgb]) return spriteCache[rgb];
      const s = document.createElement('canvas'); s.width = s.height = 48;
      const c = s.getContext('2d'); const g = c.createRadialGradient(24, 24, 0, 24, 24, 24);
      g.addColorStop(0, 'rgba(' + rgb + ',0.95)'); g.addColorStop(0.32, 'rgba(' + rgb + ',0.5)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
      c.fillStyle = g; c.fillRect(0, 0, 48, 48);
      return (spriteCache[rgb] = s);
    }
    function resize() {
      const r = stage.getBoundingClientRect();
      dpr = MOBILE ? 1 : Math.min(2, global.devicePixelRatio || 1);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function hexRGB(hex) { const n = parseInt(hex.slice(1), 16); return (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255); }
    // hit(x, y, octave, strength) — coords are pre-computed by the caller (no layout read here)
    function hit(x, y, octave, strength) {
      const rgb = hexRGB(OCT_HEX[clampOct(octave)] || '#8b6bff');
      if (x == null) { x = W * 0.5; y = H - 30; }
      const n = MOBILE ? 1 + Math.round((strength || 1)) : 4 + Math.round((strength || 1) * 4);
      const cap = MOBILE ? 20 : 300;                 // fewer live particles on phones = lighter frames = smoother emit (halved again on user request)
      const spd = MOBILE ? 2 : 1;                    // the viz runs at ~30fps on mobile, so double per-step motion + decay to keep the same real-time speed (and stop particles lingering 2x longer)
      for (let i = 0; i < n && parts.length < cap; i++) {
        parts.push({ x: x + (Math.random() - 0.5) * 14, y: y, vx: (Math.random() - 0.5) * 0.5 * spd,
          vy: -(0.7 + Math.random() * 1.7) * spd, life: 1, decay: (0.006 + Math.random() * 0.01) * spd, size: 1.4 + Math.random() * 2.6, rgb });
      }
      if (rings.length < (MOBILE ? 4 : 26)) rings.push({ x, y, r: 6, life: 1, rgb });
      if (!MOBILE) glow = Math.min(1, glow + 0.5);   // skip the full-canvas glow fill on phones (big fill cost, esp. fullscreen)
      if (rgb !== glowColor) { glowColor = rgb; glowGrad = null; }   // rebuild cached gradient only on colour change
      start();
    }
    let glowGrad = null, glowGradWH = 0, fskip = false;
    function frame() {
      if (MOBILE) { fskip = !fskip; if (fskip) { raf = requestAnimationFrame(frame); return; } }   // ~30fps on phones: halve the emit render cost so the particles (and the audio scheduler sharing the main thread) stay smooth
      ctx.clearRect(0, 0, W, H);
      if (glow > 0.01) {
        if (!glowGrad || glowGradWH !== W + H) {
          glowGrad = ctx.createRadialGradient(W / 2, H, 0, W / 2, H, H * 1.1);
          glowGrad.addColorStop(0, 'rgba(' + glowColor + ',1)'); glowGrad.addColorStop(1, 'rgba(' + glowColor + ',0)');
          glowGradWH = W + H;
        }
        ctx.globalAlpha = 0.1 * glow; ctx.fillStyle = glowGrad; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; glow *= 0.94;
      }
      ctx.globalCompositeOperation = 'lighter';
      for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.r += 2.4; r.life -= 0.03;
        if (r.life <= 0) { rings.splice(i, 1); continue; }
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.283);
        ctx.strokeStyle = 'rgba(' + r.rgb + ',' + (0.5 * r.life).toFixed(3) + ')'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i];
        p.x += p.vx; p.y += p.vy; p.vy *= 0.995; p.life -= p.decay;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        const d = p.size * 7 * (0.55 + 0.45 * p.life);   // shrink as they rise → depth
        ctx.globalAlpha = p.life > 1 ? 1 : p.life;
        ctx.drawImage(sprite(p.rgb), p.x - d / 2, p.y - d / 2, d, d);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (parts.length || rings.length || glow > 0.01) raf = requestAnimationFrame(frame);
      else running = false;
    }
    function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
    function stop() { running = false; cancelAnimationFrame(raf); parts.length = 0; rings.length = 0; glow = 0; ctx.clearRect(0, 0, W, H); }
    resize();
    const onResize = () => resize();
    global.addEventListener('resize', onResize);
    return { hit, resize, stop, destroy() { global.removeEventListener('resize', onResize); stop(); } };
  }

  /* --------------------------- player factory ---------------------------- */
  const ALL_PLAYERS = [];

  function createPlayer(mount, song, opts) {
    opts = opts || {};
    const blocks = parseNotation(song.notation);
    const { cols, blockMeta, total } = buildTimeline(blocks);
    const baseCps = song.cps || opts.cps || 6;
    const withPiano = opts.piano !== false;

    // add classes (never clobber) — keeps any reveal '.in' and forces the player visible,
    // even though notation may mount asynchronously after the reveal observer ran
    mount.classList.add('player', 'in');
    mount.innerHTML =
      '<div class="player-top">' +
        '<div class="progress"><div class="progress-fill"></div><div class="ab-mark ab-a" hidden></div><div class="ab-mark ab-b" hidden></div></div>' +
        '<div class="player-bar">' +
          '<button class="play-btn" aria-label="Play"></button>' +
          '<div class="transport-title"><b></b><span></span></div>' +
          '<div class="transport-controls">' +
            '<div class="ctrl"><label>Sound</label><select class="voice-sel" aria-label="Instrument sound">' +
              VOICES.map((v) => '<option value="' + v.id + '">' + v.name + '</option>').join('') + '</select></div>' +
            '<div class="ctrl"><label>Speed</label><input type="range" class="slider spd" min="0.4" max="2" step="0.05" value="1"><output class="spd-out">1.0×</output></div>' +
            '<div class="ctrl"><span class="icon-btn vol-ic" title="Volume">' + I.vol + '</span><input type="range" class="slider vol" min="0" max="1" step="0.02" value="0.85"></div>' +
            '<button class="icon-btn learn-btn" title="Learn — falling notes">' + I.learn + '</button>' +
            '<button class="icon-btn loop-btn" title="Loop">' + I.loop + '</button>' +
            '<button class="icon-btn restart-btn" title="Restart">' + I.restart + '</button>' +
            '<button class="icon-btn present-btn" title="Presentation / record mode">' + I.present + '</button>' +
            '<button class="icon-btn fs-btn" title="Cinema mode">' + I.fs + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="practice-bar">' +
          '<div class="pr-group"><span class="pr-label">Hands</span>' +
            '<button type="button" class="pr-btn hand-btn active" data-hand="both">Both</button>' +
            '<button type="button" class="pr-btn hand-btn" data-hand="R">Right</button>' +
            '<button type="button" class="pr-btn hand-btn" data-hand="L">Left</button>' +
          '</div>' +
          '<div class="pr-group"><span class="pr-label">Transpose</span>' +
            '<button type="button" class="pr-btn tr-btn" data-tr="-1" aria-label="Transpose down">–</button>' +
            '<span class="tr-out">0</span>' +
            '<button type="button" class="pr-btn tr-btn" data-tr="1" aria-label="Transpose up">+</button>' +
          '</div>' +
          '<div class="pr-group"><span class="pr-label">Loop A–B</span>' +
            '<button type="button" class="pr-btn ab-btn" data-ab="a">Set A</button>' +
            '<button type="button" class="pr-btn ab-btn" data-ab="b">Set B</button>' +
            '<button type="button" class="pr-btn ab-btn ab-off" data-ab="clear">Clear</button>' +
          '</div>' +
          '<div class="pr-group"><span class="pr-label">Measure</span>' +
            '<button type="button" class="pr-btn meas-btn" data-meas="-1" aria-label="Previous measure">◀</button>' +
            '<span class="meas-out">1 / 1</span>' +
            '<button type="button" class="pr-btn meas-btn" data-meas="1" aria-label="Next measure">▶</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="player-body' + (withPiano ? '' : ' no-stage') + '">' +
        '<div class="notation-pane"><div class="notation"></div></div>' +
        (withPiano ? '<div class="stage"><canvas class="viz"></canvas><canvas class="falling"></canvas><div class="stage-shine"></div>' +
          '<div class="stage-head"><span class="stage-caption">Live keyboard</span></div>' +
          '<div class="stage-hint">Press <b>▶</b> to play — the keys below light up as it goes</div>' +
          '<div class="stage-spacer"></div>' +
          '<div class="piano-scroll"></div><div class="oct-legend"></div></div>' : '') +
      '</div>' +
      '<button class="present-exit" type="button" aria-label="Exit presentation mode">✕ Exit · Esc</button>' +
      '<div class="present-count" hidden></div>';

    const $ = (s) => mount.querySelector(s);
    const playBtn = $('.play-btn'), progressBar = $('.progress'), progressFill = $('.progress-fill'), measOut = $('.meas-out');
    const notationEl = $('.notation'), pane = $('.notation-pane');
    $('.transport-title b').textContent = song.title || 'Untitled';
    $('.transport-title span').textContent = song.artist || song.composer || '';
    playBtn.innerHTML = I.play;

    // ---- render score (cheap: notes are spans, dashes are text) ----
    let colNoteSpans, blocksInfo;
    ({ colNoteSpans, blocksInfo } = renderScore(blocks, blockMeta, notationEl));   // re-assigned on transpose

    // ---- stage: piano + visualizer ----
    let piano = null, viz = null, pianoResize = null, keyPos = {};
    // ---- falling-notes "Learn" mode ----
    let learnMode = false, fallCanvas = null, fallCtx = null, fallNotes = null, fallW = 1, fallH = 1, fallDpr = 1, whiteBarW = 14, blackBarW = 10;
    if (withPiano) {
      const range = opts.pianoRange || rangeFromCols(cols);
      viz = Visualizer($('.viz'), $('.stage'));
      piano = buildPiano($('.piano-scroll'), range, (freq, keyEl, oct, midi) => {
        Synth.note(freq); const p = keyPos[midi]; if (viz) viz.hit(p ? p.x : null, p ? p.y : null, oct, 1.2);
      });
      buildLegend($('.oct-legend'), range);
      // cache each key's centre relative to the canvas ONCE (re-synced on resize/scroll),
      // so playback never calls getBoundingClientRect per note (was the animation stutter)
      const syncKeyPos = () => {
        const canvas = $('.viz'); if (!canvas || !piano || !canvas.getBoundingClientRect) return;
        const cr = canvas.getBoundingClientRect(); const map = {};
        for (const midi in piano.keys) { const kr = piano.keys[midi].getBoundingClientRect(); map[midi] = { x: kr.left + kr.width / 2 - cr.left, y: kr.top - cr.top }; }
        keyPos = map;
      };
      fallCanvas = $('.falling'); fallCtx = fallCanvas && fallCanvas.getContext && fallCanvas.getContext('2d');
      const refit = () => { fitPiano($('.piano-scroll'), range, $('.stage')); syncKeyPos(); if (fallCtx && learnMode) { sizeFalling(); drawFalling(currentElapsed()); } };
      refit();
      pianoResize = refit;
      if (global.addEventListener) global.addEventListener('resize', pianoResize);
      if (global.requestAnimationFrame) global.requestAnimationFrame(refit);
      const ps = $('.piano-scroll');
      if (ps) ps.addEventListener('scroll', () => { if (global.requestAnimationFrame) global.requestAnimationFrame(syncKeyPos); }, { passive: true });
    }

    // ---- state ----
    let playing = false, colDur = 1 / baseCps, speed = 1;
    let startTime = 0, pausedAt = 0, nextCol = 0, lastVisCol = -1, curBlock = -1, loop = false;
    let handMode = 'both';                                  // 'both' | 'R' | 'L' — practice one hand at a time
    let transpose = 0;                                      // semitone shift for playback + display
    let loopA = -1, loopB = -1;                             // A–B section loop (column indices), -1 = unset
    const playable = (ev) => handMode === 'both' || !ev.hand || ev.hand === handMode;

    /* -------------------- falling-notes "Learn" renderer ------------------ */
    const BLACK_SET = { 1: 1, 3: 1, 6: 1, 8: 1, 10: 1 };
    const midiIsBlack = (m) => !!BLACK_SET[((m % 12) + 12) % 12];
    function rrect(c, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
    // extract note segments {midi,hand,startCol,lenCols} from the parsed blocks (held notes run through '-')
    function buildFallNotes() {
      const arr = [];
      blocks.forEach((block, bi) => {
        const startG = blockMeta[bi].start;
        for (const line of block) {
          const content = line.content;
          for (let c = 0; c < content.length; c++) {
            if (!isNoteChar(content[c])) continue;
            let len = 1, k = c + 1; while (k < content.length && content[k] === '-') { len++; k++; }
            const midi = noteToMidi(content[c], line.octave);
            if (midi != null) arr.push({ midi: midi, hand: line.hand || 'R', startCol: startG + c, lenCols: len });
          }
        }
      });
      return arr;
    }
    function sizeFalling() {
      if (!fallCanvas || !fallCtx) return;
      const st = mount.querySelector('.stage'); if (!st) return;
      const r = st.getBoundingClientRect();
      fallDpr = MOBILE ? 1 : Math.min(2, global.devicePixelRatio || 1);
      fallW = Math.max(1, r.width); fallH = Math.max(1, r.height);
      fallCanvas.width = fallW * fallDpr; fallCanvas.height = fallH * fallDpr;
      fallCanvas.style.width = fallW + 'px'; fallCanvas.style.height = fallH + 'px';
      fallCtx.setTransform(fallDpr, 0, 0, fallDpr, 0, 0);
      // match each bar to its actual key width (small inset so adjacent bars stay distinct)
      let wkw = 0, bkw = 0;
      for (const m in piano.keys) {
        const w = piano.keys[m].getBoundingClientRect().width || 0;
        if (midiIsBlack(+m)) { if (!bkw) bkw = w; } else if (!wkw) wkw = w;
        if (wkw && bkw) break;
      }
      if (!wkw) wkw = 20; if (!bkw) bkw = wkw * 0.6;
      whiteBarW = Math.max(4, wkw * 0.5); blackBarW = Math.max(3, bkw * 0.5);   // ~half key width
    }
    // draw upcoming notes falling toward their keys; a note reaches its key-top exactly at play time
    function drawFalling(elapsed) {
      if (!fallCtx) return;
      fallCtx.clearRect(0, 0, fallCanvas.width, fallCanvas.height);
      if (!learnMode || !fallNotes) return;
      const WINDOW = 2.2;                          // seconds of look-ahead shown
      for (const n of fallNotes) {
        if (handMode !== 'both' && n.hand && n.hand !== handMode) continue;
        const midi = n.midi + transpose, kp = keyPos[midi]; if (!kp) continue;
        const tStart = n.startCol * colDur, tEnd = (n.startCol + n.lenCols) * colDur;
        if (tEnd < elapsed - 0.06 || tStart > elapsed + WINDOW) continue;
        const hitY = kp.y;                          // land here (top of this key)
        const yHead = hitY * (1 - (tStart - elapsed) / WINDOW);
        const yTail = hitY * (1 - (tEnd - elapsed) / WINDOW);
        const top = Math.max(0, Math.min(yHead, yTail));
        const bot = Math.min(hitY, Math.max(yHead, yTail));
        if (bot - top < 1) continue;
        const oct = Math.floor(midi / 12) - 1, o = clampOct(oct), barW = midiIsBlack(midi) ? blackBarW : whiteBarW;
        const active = elapsed >= tStart && elapsed < tEnd;
        const col = OCT_HEX[o] || '#8b6bff';
        fallCtx.save();
        if (!MOBILE) { fallCtx.shadowColor = col; fallCtx.shadowBlur = active ? 22 : 13; }   // glow — shadowBlur is very costly on mobile GPUs, so skip it there
        fallCtx.globalAlpha = active ? 0.85 : (MOBILE ? 0.5 : 0.42);            // translucent (a touch more opaque on mobile to compensate for the missing glow)
        fallCtx.fillStyle = col;
        rrect(fallCtx, kp.x - barW / 2, top, barW, bot - top, Math.min(4, barW / 2)); fallCtx.fill();
        fallCtx.restore();
        if (active) { fallCtx.globalAlpha = 0.85; fallCtx.fillStyle = '#fff'; rrect(fallCtx, kp.x - barW / 2, hitY - 3, barW, 3, 1.5); fallCtx.fill(); fallCtx.globalAlpha = 1; }
      }
      fallCtx.globalAlpha = 1;
    }
    let schedTimer = 0, raf = 0;
    let live = [];                 // {nodes,end} scheduled within the look-ahead window only
    let litNotes = [], litKeys = [];
    // Wider look-ahead on mobile: the audio scheduler is a main-thread setInterval, so a heavy
    // render/scroll frame can delay it. A bigger buffer means notes are already scheduled ahead and
    // keep sounding cleanly through a frame spike (voice-stealing still caps live oscillators at 32).
    const LOOKAHEAD_FG = MOBILE ? 0.5 : 0.3, LOOKAHEAD_BG = 2.5;   // bg window covers the ~1s background-timer throttle so audio keeps flowing cleanly
    let LOOKAHEAD = LOOKAHEAD_FG; const TICK = MOBILE ? 40 : 30;

    const state = { get playing() { return playing; }, play, pause, toggle, stop, haltForNav, seekCol: (c) => seekTo(c / total),
      seekBlock: (n) => { if (blockMeta[n]) seekTo(blockMeta[n].start / total); }, el: mount,
      destroy() { hardStop(); if (viz) viz.destroy(); if (pianoResize && global.removeEventListener) global.removeEventListener('resize', pianoResize);
        if (global.document) { document.removeEventListener('fullscreenchange', onFsChange); document.removeEventListener('webkitfullscreenchange', onFsChange); document.removeEventListener('visibilitychange', onBg); document.removeEventListener('keydown', onPresentKey); }
        if (global.removeEventListener) { global.removeEventListener('blur', onBlur); global.removeEventListener('focus', onFocus); } } };
    ALL_PLAYERS.push(state);

    // Background-safe scheduling: when the tab is hidden OR the window loses focus (user switched to
    // another app), browsers throttle setInterval to ~1s and pause rAF. Widen the audio look-ahead so a
    // single throttled tick still buffers enough sound, and top it up right at the transition so there's
    // no gap. rAF (visuals) can sleep in the background — only the audio clock needs to keep flowing.
    let winBlur = false;
    function applyLookahead() {
      const bg = (global.document && global.document.hidden) || winBlur;
      LOOKAHEAD = bg ? LOOKAHEAD_BG : LOOKAHEAD_FG;
      if (playing) schedule();                 // pre-fill the (now larger) window before throttling bites
    }
    const onBg = function () { applyLookahead(); };
    const onBlur = function () { winBlur = true; applyLookahead(); };
    const onFocus = function () { winBlur = false; applyLookahead(); };
    if (global.document) global.document.addEventListener('visibilitychange', onBg);
    if (global.addEventListener) { global.addEventListener('blur', onBlur); global.addEventListener('focus', onFocus); }

    // ---- controls ----
    playBtn.addEventListener('click', toggle);
    $('.restart-btn').addEventListener('click', () => { stop(); play(); });
    $('.loop-btn').addEventListener('click', function () { loop = !loop; this.classList.toggle('active', loop); });

    // ---- learn / falling notes ----
    const learnBtn = $('.learn-btn');
    if (learnBtn) learnBtn.addEventListener('click', function () {
      learnMode = !learnMode; mount.classList.toggle('learn', learnMode); this.classList.toggle('active', learnMode);
      if (learnMode) { if (!fallNotes) fallNotes = buildFallNotes(); sizeFalling(); drawFalling(currentElapsed()); }
      else if (fallCtx) fallCtx.clearRect(0, 0, fallCanvas.width, fallCanvas.height);
    });

    // ---- presentation / record mode: hide all chrome, 2-second count-in, then auto-play ----
    let presentTimer = null;
    // hiding the chrome + going fullscreen relayouts the stage, so re-sync key positions + the falling
    // canvas AFTER the layout settles (a couple of delayed passes catch the fullscreen transition).
    function scheduleResync() {
      const doit = () => { if (pianoResize) pianoResize(); if (viz) viz.resize(); };
      if (global.requestAnimationFrame) global.requestAnimationFrame(doit);
      setTimeout(doit, 140); setTimeout(doit, 420);
    }
    function enterPresent() {
      if (mount.classList.contains('present')) return;
      if (!isFsActive()) toggleFullscreen();          // go cinematic fullscreen
      mount.classList.add('present');
      scheduleResync();                               // fix landing position after the relayout
      const cd = $('.present-count');
      if (playing) { if (cd) cd.hidden = true; return; }   // already playing → no pointless countdown
      // not playing: count 3-2-1 (visible), then blank for 1s, then play
      let n = 3;
      if (cd) { cd.textContent = n; cd.hidden = false; }
      if (presentTimer) clearInterval(presentTimer);
      presentTimer = setInterval(function () {
        n--;
        if (n > 0) { if (cd) cd.textContent = n; }          // 2, 1
        else if (n === 0) { if (cd) cd.hidden = true; }     // number disappears
        else { clearInterval(presentTimer); presentTimer = null; if (!playing) play(); }   // +1s blank, then play
      }, 1000);
    }
    function clearPresent() {                          // tear down the present UI (does not touch fullscreen)
      if (presentTimer) { clearInterval(presentTimer); presentTimer = null; }
      const cd = $('.present-count'); if (cd) cd.hidden = true;
      mount.classList.remove('present');
    }
    const presentBtn = $('.present-btn');
    if (presentBtn) presentBtn.addEventListener('click', enterPresent);
    const presentExit = $('.present-exit');
    if (presentExit) presentExit.addEventListener('click', function () { if (isFsActive()) toggleFullscreen(); else { clearPresent(); if (playing) pause(); } });
    const onPresentKey = function (e) { if (e.key === 'Escape' && mount.classList.contains('present') && !isFsActive()) { clearPresent(); if (playing) pause(); } };
    if (global.document) document.addEventListener('keydown', onPresentKey);

    // ---- fullscreen ----
    $('.fs-btn').addEventListener('click', toggleFullscreen);
    function isFsActive() { return !!(document.fullscreenElement || document.webkitFullscreenElement) || mount.classList.contains('fs-fallback'); }
    function toggleFullscreen() {
      // Phones/tablets: iOS Safari has no reliable element-level Fullscreen API (only <video>), and even
      // where it exists it fights the on-screen keyboard/toolbars. Always use our own CSS overlay instead —
      // it's a real full-viewport layer we fully control (see .fs-fallback, sized with 100dvh).
      if (MOBILE) { mount.classList.toggle('fs-fallback'); onFsChange(); return; }
      try {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        } else if (mount.requestFullscreen) { mount.requestFullscreen(); }
        else if (mount.webkitRequestFullscreen) { mount.webkitRequestFullscreen(); }
        else { mount.classList.toggle('fs-fallback'); onFsChange(); }
      } catch (e) { mount.classList.toggle('fs-fallback'); onFsChange(); }
    }
    // A position:fixed element is contained by ANY ancestor with a transform/filter/perspective/etc. — and
    // here both a wrapper AND <body> (its page-in animation leaves an identity transform) do this, so the
    // CSS-overlay "fullscreen" was contained by them and only covered part of the screen (and scrolled with
    // the page). Neutralise those properties on the ancestors on the way in, restore on the way out, so the
    // fixed overlay is finally relative to the viewport and truly fills it.
    let fsNeutralised = [];
    function neutraliseContainers() {
      if (fsNeutralised.length) return;
      const nodes = []; let el = mount.parentElement;
      while (el && el !== document.documentElement) { nodes.push(el); el = el.parentElement; }
      if (document.body) nodes.push(document.body);
      nodes.forEach(function (n) {
        const cs = getComputedStyle(n);
        const traps = cs.transform !== 'none' || cs.perspective !== 'none' || cs.filter !== 'none' ||
          (cs.backdropFilter && cs.backdropFilter !== 'none') || /transform|filter|perspective/.test(cs.willChange || '') ||
          /paint|layout|strict|content/.test(cs.contain || '');
        if (!traps) return;
        const saved = { n: n, transform: n.style.transform, perspective: n.style.perspective, filter: n.style.filter, backdropFilter: n.style.backdropFilter, willChange: n.style.willChange, contain: n.style.contain, animation: n.style.animation };
        n.style.transform = 'none'; n.style.perspective = 'none'; n.style.filter = 'none'; n.style.backdropFilter = 'none';
        n.style.willChange = 'auto'; n.style.contain = 'none'; n.style.animation = 'none';   // animation:none kills the page-in's held identity transform
        fsNeutralised.push(saved);
      });
    }
    function restoreContainers() {
      fsNeutralised.forEach(function (s) {
        s.n.style.transform = s.transform || ''; s.n.style.perspective = s.perspective || ''; s.n.style.filter = s.filter || '';
        s.n.style.backdropFilter = s.backdropFilter || ''; s.n.style.willChange = s.willChange || ''; s.n.style.contain = s.contain || '';
        s.n.style.animation = (s.n === document.body) ? 'none' : (s.animation || '');   // don't replay the body page-in on exit
      });
      fsNeutralised = [];
    }
    function onFsChange() {
      const on = isFsActive();
      const btn = $('.fs-btn'); if (btn) btn.classList.toggle('active', on);
      mount.classList.toggle('cinema', on);
      // CSS-overlay fallback (mobile): flag <html> to hide the site header/footer + lock scroll, and
      // neutralise the transformed ancestors that were containing (and shrinking) the fixed overlay.
      if (global.document && document.documentElement) {
        const fb = mount.classList.contains('fs-fallback');
        document.documentElement.classList.toggle('drd-fs', fb);
        if (fb) neutraliseContainers(); else restoreContainers();
      }
      const cap = $('.stage-caption');   // cinema mode: name the piece instead of the generic caption
      if (cap) cap.textContent = on ? ((song.title || '') + (song.composer ? '  ·  ' + song.composer : '')) : 'Live keyboard';
      if (!on) { const wasPresent = mount.classList.contains('present'); clearPresent(); if (wasPresent && playing) pause(); }   // leaving fullscreen ends presentation
      scheduleResync();   // re-sync key positions + falling canvas after the fullscreen relayout settles
    }
    if (global.document) {
      document.addEventListener('fullscreenchange', onFsChange);
      document.addEventListener('webkitfullscreenchange', onFsChange);
    }
    const spd = $('.spd'), spdOut = $('.spd-out'), vol = $('.vol');
    spd.addEventListener('input', function () {
      speed = parseFloat(this.value); spdOut.textContent = speed.toFixed(1) + '×'; setFill(this);
      const was = playing, at = currentElapsed();
      colDur = 1 / (baseCps * speed);
      if (was) { hardStop(); pausedAt = at; playing = false; play(); }
    });
    vol.addEventListener('input', function () { Synth.setVolume(parseFloat(this.value)); setFill(this); });
    setFill(spd); setFill(vol);
    // instrument voice — shared across the whole session (localStorage), previewed on change
    const voiceSel = $('.voice-sel');
    if (voiceSel) {
      voiceSel.value = Synth.voiceId;
      voiceSel.addEventListener('change', function () {
        Synth.setVoice(this.value); Synth.ensure();
        try { Synth.note(440); } catch (e) {}        // A4 taster so the choice is audible immediately
      });
    }

    /* --------------------- practice tools (hands / transpose / A–B loop) --------------------- */
    const curCol = () => Math.max(0, Math.min(total - 1, Math.floor(currentElapsed() / colDur)));
    // hands
    const handBtns = Array.prototype.slice.call(mount.querySelectorAll('.hand-btn'));
    handBtns.forEach((b) => b.addEventListener('click', function () {
      handMode = this.getAttribute('data-hand');
      handBtns.forEach((x) => x.classList.toggle('active', x === this));
    }));
    // transpose — re-renders the letter notation (display) + shifts the audio; audio uses the original
    // timeline plus `transpose`, so cols never change (no double-shift) and the playhead stays aligned.
    const trOut = $('.tr-out');
    function applyTranspose() {
      const tb = transposeBlocks(blocks, transpose);
      const r = renderScore(tb, blockMeta, notationEl);
      colNoteSpans = r.colNoteSpans; blocksInfo = r.blocksInfo;
      curBlock = -1; if (pane) pane.__block = null;
      if (playing) { lastVisCol = -1; }                 // next visual() frame repaints
      else paintColumn(curCol());
    }
    Array.prototype.slice.call(mount.querySelectorAll('.tr-btn')).forEach((b) => b.addEventListener('click', function () {
      const nv = Math.max(-12, Math.min(12, transpose + parseInt(this.getAttribute('data-tr'), 10)));
      if (nv === transpose) return;
      transpose = nv; if (trOut) trOut.textContent = (transpose > 0 ? '+' : '') + transpose;
      applyTranspose();
    }));
    // A–B section loop
    const abA = $('.ab-btn[data-ab="a"]'), abB = $('.ab-btn[data-ab="b"]');
    const markA = $('.ab-a'), markB = $('.ab-b');
    function updateAbUI() {
      if (abA) abA.classList.toggle('set', loopA >= 0);
      if (abB) abB.classList.toggle('set', loopB >= 0);
      if (markA) { markA.hidden = loopA < 0; if (loopA >= 0) markA.style.left = (loopA / total * 100) + '%'; }
      if (markB) { markB.hidden = loopB < 0; if (loopB >= 0) markB.style.left = (loopB / total * 100) + '%'; }
    }
    Array.prototype.slice.call(mount.querySelectorAll('.ab-btn')).forEach((b) => b.addEventListener('click', function () {
      const which = this.getAttribute('data-ab');
      if (which === 'a') { loopA = curCol(); if (loopB >= 0 && loopB <= loopA) loopB = -1; }
      else if (which === 'b') { const c = curCol(); loopB = (loopA >= 0 && c <= loopA) ? Math.min(total - 1, loopA + 1) : c; if (loopA < 0) loopA = 0; }
      else { loopA = -1; loopB = -1; }
      updateAbUI();
    }));

    // measure stepper — jump measure-by-measure (blocks); press play to start from there
    if (measOut) measOut.textContent = '1 / ' + blocksInfo.length;
    Array.prototype.slice.call(mount.querySelectorAll('.meas-btn')).forEach((b) => b.addEventListener('click', function () {
      const dir = +this.getAttribute('data-meas');
      const base = curBlock >= 0 ? curBlock : 0;
      const n = Math.max(0, Math.min(blocksInfo.length - 1, base + dir));
      seekTo(blockMeta[n].start / total);
    }));

    progressBar.addEventListener('click', (e) => { const r = progressBar.getBoundingClientRect(); seekTo(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); });
    notationEl.addEventListener('click', (e) => {
      const s = e.target.closest('.nn'); if (!s) return;
      Synth.note(parseFloat(s.dataset.freq));
      const midi = +s.dataset.midi;
      s.classList.add('hit'); setTimeout(() => s.classList.remove('hit'), 180);
      const p = keyPos[midi]; if (viz && p) viz.hit(p.x, p.y, +s.dataset.oct, 1.2);
    });

    /* --------------------------- transport ----------------------------- */
    function currentElapsed() { return playing ? Math.max(0, Synth.ctx.currentTime - startTime) : pausedAt; }
    function toggle() { playing ? pause() : play(); }

    function play() {
      Synth.ensure(); Synth.setVolume(parseFloat(vol.value));
      ALL_PLAYERS.forEach((p) => { if (p !== state && p.playing) p.pause(); });
      const begin = function () {
        if (playing) return;
        // Base the transport on the *running* clock, with a small lead so the first notes are always
        // scheduled slightly in the future. Safari drops oscillators started in the past OR while the
        // context is still suspended, so both guards matter.
        startTime = Synth.ctx.currentTime - pausedAt + 0.09;
        nextCol = Math.max(0, Math.floor(pausedAt / colDur + 1e-6));
        lastVisCol = -1;
        playing = true; mount.classList.add('played'); playBtn.classList.add('playing'); playBtn.innerHTML = I.pause; playBtn.setAttribute('aria-label', 'Pause');
        schedTimer = setInterval(schedule, TICK); schedule();
        raf = requestAnimationFrame(visual);
      };
      // Safari/iOS: resume() is async; anything scheduled before the context is actually 'running' is
      // silently dropped (Chrome plays it once resumed — hence "works in Chrome, silent in Safari").
      // Start the transport only once the context is confirmed running.
      if (Synth.ctx && Synth.ctx.state === 'running') { begin(); return; }
      // Only start once the context is CONFIRMED running — on iOS Safari a context can sit 'suspended' and
      // oscillators scheduled while suspended are silently dropped (→ "played but no sound on the new piece").
      // Never start on a rejected/early resume; re-kick resume periodically; force-start only as a last resort.
      let launched = false;
      const tryStart = function () { if (launched) return false; if (Synth.ctx && Synth.ctx.state === 'running') { launched = true; begin(); return true; } return false; };
      try { const pr = Synth.ctx && Synth.ctx.resume && Synth.ctx.resume(); if (pr && pr.then) pr.then(tryStart, function () {}); } catch (e) {}
      let tries = 0;
      const poll = setInterval(function () {
        if (tryStart()) { clearInterval(poll); return; }
        if (++tries % 8 === 0) { try { Synth._kick(); } catch (e) {} }              // re-nudge iOS every ~400ms
        if (tries >= 60) { clearInterval(poll); if (!launched) { launched = true; begin(); } }   // ~3s last-resort start so the button is never dead
      }, 50);
    }
    function pause() {
      pausedAt = currentElapsed(); playing = false;
      clearInterval(schedTimer); cancelAnimationFrame(raf); stopLive();
      playBtn.classList.remove('playing'); playBtn.innerHTML = I.play; playBtn.setAttribute('aria-label', 'Play');
    }
    // Like pause() but WITHOUT stopLive() — used only by the pagehide handler, where the master-bus fade
    // silences the live notes click-free (o.stop() would pop on Safari). Oscillators self-terminate at their
    // already-scheduled stop times; the page is unloading anyway.
    function haltForNav() {
      if (!playing) return;
      pausedAt = currentElapsed(); playing = false;
      clearInterval(schedTimer); cancelAnimationFrame(raf);
      playBtn.classList.remove('playing'); playBtn.innerHTML = I.play; playBtn.setAttribute('aria-label', 'Play');
    }
    function stop() {
      hardStop(); pausedAt = 0; lastVisCol = -1; curBlock = -1;
      progressFill.style.width = '0%'; clearHighlights(); blocksInfo.forEach((b) => b.playhead.classList.remove('on'));
    }
    function hardStop() {
      playing = false; clearInterval(schedTimer); cancelAnimationFrame(raf); stopLive();
      playBtn.classList.remove('playing'); playBtn.innerHTML = I.play;
    }
    function stopLive() { live.forEach((n) => n.nodes.forEach((o) => { try { o.stop(); } catch (e) {} })); live = []; }
    function seekTo(frac) {
      const col = Math.max(0, Math.min(total - 1, Math.floor(frac * total)));
      const was = playing; hardStop(); pausedAt = col * colDur;
      if (was) play(); else { paintColumn(col); progressFill.style.width = (frac * 100) + '%'; if (learnMode) drawFalling(pausedAt); }
    }

    // look-ahead scheduler — only ~0.18s of audio ever exists at once
    function schedule() {
      if (!playing) return;
      const now = Synth.ctx.currentTime, horizon = now + LOOKAHEAD;
      live = live.filter((n) => n.end > now);       // let finished nodes GC
      while (nextCol < total && startTime + nextCol * colDur < horizon) {
        const when = Math.max(startTime + nextCol * colDur, now);
        const evs = cols[nextCol].events;
        let topMidi = -1; for (const ev of evs) if (playable(ev) && ev.midi > topMidi) topMidi = ev.midi;   // melody = the top (skyline) note
        for (const ev of evs) { if (!playable(ev)) continue; const vel = ev.midi === topMidi ? 1.0 : 0.6; live.push({ nodes: Synth.note(midiToFreq(ev.midi + transpose), when, vel), end: when + 3 }); }
        nextCol++;
      }
    }

    /* ----------------------------- visuals ----------------------------- */
    let visSkip = false;
    function visual() {
      if (!playing) return;
      if (MOBILE) { visSkip = !visSkip; if (visSkip) { raf = requestAnimationFrame(visual); return; } }   // ~30fps on phones: the playhead stays smooth but halves per-frame render/DOM work
      const elapsed = Synth.ctx.currentTime - startTime;
      if (learnMode) drawFalling(elapsed);
      const col = Math.max(0, Math.floor(elapsed / colDur));
      if (loopA >= 0 && loopB > loopA && col >= loopB) { seekTo(loopA / total); return; }   // A–B section loop
      if (col >= total) { if (loop) { stop(); play(); return; } stop(); return; }
      if (col !== lastVisCol) { paintColumn(col); lastVisCol = col; }
      progressFill.style.width = Math.max(0, (elapsed / (total * colDur)) * 100) + '%';
      raf = requestAnimationFrame(visual);
    }
    function paintColumn(col) {
      // advance block pointer (amortised O(1))
      while (curBlock + 1 < blocksInfo.length && col >= blocksInfo[curBlock + 1].start) curBlock++;
      while (curBlock >= 0 && col < blocksInfo[curBlock].start) curBlock--;
      const b = blocksInfo[curBlock];
      if (measOut) measOut.textContent = (Math.max(0, curBlock) + 1) + ' / ' + blocksInfo.length;
      if (b) {
        for (const o of blocksInfo) if (o !== b && o.phOn) { o.playhead.classList.remove('on'); o.phOn = false; }
        b.playhead.style.transform = 'translateX(' + (b.bodyLeft + (col - b.start) * b.chW) + 'px)';
        if (!b.phOn) { b.playhead.classList.add('on'); b.phOn = true; }
        if (b.el.__lastScroll !== col - b.start || pane.__block !== b) { scrollToBlock(b); pane.__block = b; }
      }
      // clear previous highlights (no per-note timers → no leak)
      for (const s of litNotes) s.classList.remove('hit'); litNotes.length = 0;
      for (const k of litKeys) k.el.classList.remove('lit', 'lit-o' + k.o); litKeys.length = 0;
      const spans = colNoteSpans[col];
      if (spans) for (const s of spans) { if (handMode !== 'both' && s._hand && s._hand !== handMode) continue; s.classList.add('hit'); litNotes.push(s); }
      const evs = cols[col].events;
      const strength = evs.length > 3 ? 1.3 : 1;
      let vh = 0;                                   // cap particle spawns per column so dense chords/columns don't thrash the viz
      for (const ev of evs) {
        if (!playable(ev)) continue;
        const midi = ev.midi + transpose, oct = Math.floor(midi / 12) - 1, o = clampOct(oct), key = piano && piano.keys[midi];
        if (key) { key.classList.add('lit', 'lit-o' + o); litKeys.push({ el: key, o }); }
        const p = keyPos[midi]; if (viz && p && vh < 6) { viz.hit(p.x, p.y, oct, strength); vh++; }
      }
    }
    // While the user is scrolling the score themselves, don't yank it back — and never fight them
    // with a smooth-scroll animation (which also competes with rAF/audio on the main thread).
    let suppressAutoScroll = false, autoScrollTimer = 0;
    function userTouchedScore() { suppressAutoScroll = true; clearTimeout(autoScrollTimer); autoScrollTimer = setTimeout(function () { suppressAutoScroll = false; }, 1500); }
    if (pane) ['touchmove', 'wheel'].forEach((ev) => pane.addEventListener(ev, userTouchedScore, { passive: true }));
    function scrollToBlock(b) {
      if (suppressAutoScroll) return;
      const top = b.el.offsetTop, h = pane.clientHeight;
      const target = Math.max(0, top - h * 0.4);
      if (Math.abs(pane.scrollTop - target) <= 8) return;
      pane.scrollTop = target;   // always instant — a smooth-scroll animation lags and chases on fast pieces (blocks change before it lands) and adds continuous compositor jank; a jump keeps the notes on the playhead exactly
    }
    function clearHighlights() {
      for (const s of litNotes) s.classList.remove('hit'); litNotes.length = 0;
      for (const k of litKeys) k.el.classList.remove('lit', 'lit-o' + k.o); litKeys.length = 0;
    }

    // deep-link: open positioned at a given block/measure (0-indexed) so play starts from there
    if (opts && opts.startBlock != null) { var _sb = opts.startBlock | 0; if (blockMeta[_sb]) seekTo(blockMeta[_sb].start / total); }

    return state;
  }

  /* ------------------------- rendering (cheap) --------------------------- */
  function renderScore(blocks, blockMeta, el) {
    el.textContent = '';
    const colNoteSpans = [];
    const blocksInfo = [];
    const frag = document.createDocumentFragment();

    blocks.forEach((block, bi) => {
      const meta = blockMeta[bi], width = meta.width, startG = meta.start;
      for (let c = 0; c < width; c++) colNoteSpans[startG + c] = colNoteSpans[startG + c] || [];

      const blockEl = document.createElement('div'); blockEl.className = 'nota-block';
      const num = document.createElement('div'); num.className = 'nota-num'; num.textContent = String(bi + 1).padStart(2, '0'); blockEl.appendChild(num);

      const lineColLists = [];
      block.forEach((line) => {
        const lineEl = document.createElement('div');
        lineEl.className = 'nota-line' + (line.hand === 'R' ? ' rh-line' : line.hand === 'L' ? ' lh-line' : '');
        let prefix = '';
        if (line.hand) prefix += '<span class="nota-hand ' + (line.hand === 'R' ? 'rh' : 'lh') + '">' + (line.hand === 'R' ? 'RH' : 'LH') + '</span>';
        prefix += '<span class="nota-oct o' + clampOct(line.octave) + '">' + line.octave + '|</span>';
        // body: notes -> spans, dashes -> text (huge DOM saving)
        const oc = clampOct(line.octave); let body = ''; const colList = [];
        for (let c = 0; c < width; c++) {
          const ch = line.content[c] || '-';
          if (isNoteChar(ch)) {
            const realMidi = noteToMidi(ch, line.octave);
            body += '<span class="nn o' + oc + '" data-freq="' + midiToFreq(realMidi) + '" data-midi="' + realMidi + '" data-oct="' + line.octave + '">' + ch + '</span>';
            colList.push(startG + c);
          } else body += '-';
        }
        lineEl.innerHTML = prefix + '<span class="nota-body">' + body + '</span>';
        blockEl.appendChild(lineEl);
        lineColLists.push({ lineEl, colList });
      });

      const ph = document.createElement('div'); ph.className = 'playhead'; blockEl.appendChild(ph);
      frag.appendChild(blockEl);
      blocksInfo.push({ el: blockEl, playhead: ph, start: startG, width, bodyLeft: 0, chW: 8, phOn: false, _lists: lineColLists });
    });

    el.appendChild(frag);

    // one measure pass: map note spans to columns + compute playhead geometry
    blocksInfo.forEach((b) => {
      b._lists.forEach(({ lineEl, colList }) => {
        const hand = lineEl.classList.contains('rh-line') ? 'R' : lineEl.classList.contains('lh-line') ? 'L' : null;
        const spans = lineEl.querySelectorAll('.nn');
        for (let i = 0; i < spans.length; i++) { spans[i]._hand = hand; (colNoteSpans[colList[i]] = colNoteSpans[colList[i]] || []).push(spans[i]); }
      });
      const body = b.el.querySelector('.nota-body');
      if (body && b.width > 0) { b.bodyLeft = body.offsetLeft; b.chW = body.getBoundingClientRect().width / b.width; }
      delete b._lists;
    });

    return { colNoteSpans, blocksInfo };
  }

  function rangeFromCols(cols) {
    let lo = 5, hi = 4;
    cols.forEach((c) => c.events.forEach((e) => { lo = Math.min(lo, e.octave); hi = Math.max(hi, e.octave); }));
    lo = clampOct(lo); hi = clampOct(hi); if (hi < lo) { lo = 4; hi = 5; }
    return [lo, hi];
  }

  function buildPiano(scrollEl, range, onKey) {
    scrollEl.textContent = '';
    const piano = document.createElement('div'); piano.className = 'piano'; const keys = {};
    for (let oct = range[0]; oct <= range[1]; oct++) {
      const group = document.createElement('div'); group.className = 'octave-group'; group.style.width = WHITE_W * 7 + 'px';
      const label = document.createElement('div'); label.className = 'octave-label o' + oct; label.textContent = OCT_NAMES[oct] || ('Octave ' + oct); group.appendChild(label);
      WHITE.forEach((w) => {
        const midi = noteToMidi(w, oct), k = document.createElement('div');
        k.className = 'key white'; k.style.width = WHITE_W + 'px'; k.innerHTML = '<span class="o' + oct + '">' + w + '</span>';
        k.addEventListener('pointerdown', () => { onKey(midiToFreq(midi), k, oct, midi); pressFX(k, oct); });
        group.appendChild(k); keys[midi] = k;
      });
      Object.keys(BLACK).forEach((idxStr) => {
        const idx = +idxStr, letter = BLACK[idx], midi = noteToMidi(letter, oct), k = document.createElement('div');
        k.className = 'key black'; k.dataset.idx = idx; k.style.width = BLACK_W + 'px'; k.style.left = (idx + 1) * WHITE_W - BLACK_W / 2 + 'px';
        k.innerHTML = '<span class="o' + oct + '">' + letter + '</span>';
        k.addEventListener('pointerdown', () => { onKey(midiToFreq(midi), k, oct, midi); pressFX(k, oct); });
        group.appendChild(k); keys[midi] = k;
      });
      piano.appendChild(group);
    }
    scrollEl.appendChild(piano);
    return { el: piano, keys };
  }
  function pressFX(k, oct) { const o = clampOct(oct); k.classList.add('down', 'lit', 'lit-o' + o); setTimeout(() => k.classList.remove('down', 'lit', 'lit-o' + o), 220); }

  // scale the keyboard as large as it can be while keeping a FIXED, realistic
  // white-key aspect ratio (height = width * ASPECT). Limited by whichever of the
  // available width or height runs out first — so proportions never distort.
  function fitPiano(scrollEl, range, stageEl) {
    if (!scrollEl) return;
    const ASPECT = 5.5;                                   // white-key height : width
    const whites = 7 * (range[1] - range[0] + 1);
    const availW = (scrollEl.clientWidth || 320) - 6;
    const sh = stageEl && stageEl.clientHeight ? stageEl.clientHeight : 0;
    const availH = sh ? Math.max(120, sh - 210) : 220;    // leave room for caption/legend/particles
    const wKw = Math.floor(availW / whites);
    const hKw = Math.floor(availH / ASPECT);
    let kw = Math.min(wKw, hKw); kw = Math.max(12, Math.min(52, kw || 12));
    const bw = Math.max(8, Math.round(kw * 0.6));
    const h = Math.round(kw * ASPECT);
    const piano = scrollEl.querySelector('.piano');
    if (piano) { piano.style.height = h + 'px'; piano.classList.toggle('compact', kw < 22); }
    scrollEl.querySelectorAll('.octave-group').forEach((g) => { g.style.width = kw * 7 + 'px'; });
    scrollEl.querySelectorAll('.key.white').forEach((k) => { k.style.width = kw + 'px'; k.style.height = h + 'px'; });
    scrollEl.querySelectorAll('.key.black').forEach((k) => { const idx = +k.dataset.idx; k.style.width = bw + 'px'; k.style.left = ((idx + 1) * kw - bw / 2) + 'px'; k.style.height = Math.round(h * 0.63) + 'px'; });
  }

  function buildLegend(el, range) {
    if (!el) return; let html = '';
    for (let o = range[0]; o <= range[1]; o++) html += '<span class="li"><span class="dot" style="background:var(--o' + o + ');color:var(--o' + o + ')"></span>' + (OCT_NAMES[o] || 'Octave ' + o) + '</span>';
    html += '<span class="li"><span class="nota-hand rh" style="margin:0 4px 0 0">RH</span>right&nbsp;·&nbsp;<span class="nota-hand lh" style="margin:0 4px 0 8px">LH</span>left</span>';
    el.innerHTML = html;
  }
  function setFill(input) { const min = +input.min || 0, max = +input.max || 1; input.style.setProperty('--fill', ((+input.value - min) / (max - min)) * 100 + '%'); }

  /* ------------------------------ export --------------------------------- */
  global.DRD = global.DRD || {};
  global.DRD.createPlayer = createPlayer;
  global.DRD.parseNotation = parseNotation;
  global.DRD.buildTimeline = buildTimeline;
  global.DRD.noteToMidi = noteToMidi;
  global.DRD.midiToFreq = midiToFreq;
  global.DRD.buildPiano = buildPiano;   // reused by the standalone Online Piano page
  global.DRD.fitPiano = fitPiano;
  global.DRD.Synth = Synth;
})(window);
