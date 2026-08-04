/* ============================================================================
   Piece posters — a shareable image drawn from the music itself.

   The line across the poster is the piece's actual melody: the top sounding note
   of every column, plotted as pitch against time, coloured by octave with the
   same palette the notation uses. Two pieces never produce the same shape, which
   is the point — the image is a portrait of the melody rather than decoration
   wrapped round a title.

   Everything is drawn on a canvas in the browser; nothing is uploaded.
   ========================================================================== */
(function (global) {
  'use strict';
  var DRD = global.DRD || {};

  var OCT = { 2: '#ff54b2', 3: '#35e08c', 4: '#ff5f64', 5: '#f6b73f', 6: '#4fa3ff' };
  var NOTE = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11, C: 1, D: 3, F: 6, G: 8, A: 10 };
  var W = 1200, H = 675;                                  // 16:9, the shape every social card wants

  /* the melody: top sounding note per column, with its octave for the colour */
  function contour(notation) {
    var out = [];
    var blocks = [], cur = [];
    String(notation).split('\n').forEach(function (raw) {
      var t = raw.trim();
      if (t === '' || /^\d+$/.test(t)) { if (cur.length) { blocks.push(cur); cur = []; } return; }
      var m = raw.match(/^\s*(RH|LH|R|L)?\s*(\d+)\s*\|(.*)$/i);
      if (m) cur.push({ oct: +m[2], body: m[3].replace(/\|\s*$/, '') });
    });
    if (cur.length) blocks.push(cur);
    blocks.forEach(function (b) {
      var w = Math.max.apply(null, b.map(function (l) { return l.body.length; }));
      for (var c = 0; c < w; c++) {
        var top = null;
        b.forEach(function (l) {
          var ch = l.body[c];
          if (ch == null || NOTE[ch] == null) return;
          var midi = (l.oct + 1) * 12 + NOTE[ch];
          if (!top || midi > top.midi) top = { midi: midi, oct: l.oct };
        });
        if (top) out.push(top);
      }
    });
    return out;
  }

  function rounded(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw(song, notation) {
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    var cover = song.cover || {};
    var from = cover.from || '#241033', to = cover.to || '#0a0a14', mid = cover.mid || '#8b6bff';

    // background
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, from); g.addColorStop(1, to);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var glow = ctx.createRadialGradient(W * 0.24, H * 0.1, 0, W * 0.24, H * 0.1, W * 0.75);
    glow.addColorStop(0, mid + '55'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    // faint stave-ish grid
    ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
    for (var i = 1; i < 8; i++) {
      ctx.beginPath(); ctx.moveTo(0, H * i / 8); ctx.lineTo(W, H * i / 8); ctx.stroke();
    }

    // the melody line
    var pts = contour(notation);
    if (pts.length > 1) {
      var lo = Math.min.apply(null, pts.map(function (p) { return p.midi; }));
      var hi = Math.max.apply(null, pts.map(function (p) { return p.midi; }));
      var range = Math.max(6, hi - lo);
      var padX = 84, topY = 210, botY = H - 200;
      var X = function (i) { return padX + (i / (pts.length - 1)) * (W - padX * 2); };
      var Y = function (m) { return botY - ((m - lo) / range) * (botY - topY); };

      // glow pass, then the line, coloured per segment by octave
      ctx.lineJoin = ctx.lineCap = 'round';
      [[14, 0.14], [6, 0.32], [2.6, 1]].forEach(function (pass) {
        ctx.lineWidth = pass[0];
        ctx.globalAlpha = pass[1];
        for (var k = 1; k < pts.length; k++) {
          ctx.beginPath();
          ctx.strokeStyle = OCT[Math.max(2, Math.min(6, pts[k].oct))] || '#f6b73f';
          ctx.moveTo(X(k - 1), Y(pts[k - 1].midi));
          ctx.lineTo(X(k), Y(pts[k].midi));
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;

      // a dot on the first and last note, so the line reads as having a direction
      [[0, pts[0]], [pts.length - 1, pts[pts.length - 1]]].forEach(function (p) {
        ctx.beginPath();
        ctx.fillStyle = OCT[Math.max(2, Math.min(6, p[1].oct))] || '#f6b73f';
        ctx.arc(X(p[0]), Y(p[1].midi), 7, 0, Math.PI * 2); ctx.fill();
      });
    }

    // text
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,.62)';
    ctx.font = '500 22px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('DOREDOG.COM  ·  PIANO LETTER NOTES', 84, 92);

    var title = song.title || '';
    ctx.fillStyle = '#fff';
    var size = title.length > 46 ? 44 : title.length > 30 ? 56 : 68;
    ctx.font = '600 ' + size + 'px Georgia, "Times New Roman", serif';
    // wrap to two lines at most
    var words = title.split(' '), line = '', lines = [];
    words.forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > W - 168 && line) { lines.push(line); line = w; } else line = t;
    });
    lines.push(line);
    lines = lines.slice(0, 2);
    lines.forEach(function (l, i) { ctx.fillText(l, 84, 156 + i * (size + 8)); });

    ctx.fillStyle = 'rgba(255,255,255,.78)';
    ctx.font = '400 30px Georgia, "Times New Roman", serif';
    ctx.fillText(song.composer || '', 84, H - 128);

    // level chip + duration
    var lv = DRD.level ? DRD.level(song) : null;
    var meta = [];
    if (lv) meta.push('Level ' + lv.n + ' · ' + lv.band);
    if (song.dur && DRD.fmtDur) meta.push(DRD.fmtDur(song.dur));
    if (song.genre) meta.push(song.genre);
    ctx.font = '500 24px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillText(meta.join('   ·   '), 84, H - 84);

    // corner mark
    ctx.fillStyle = 'rgba(255,255,255,.10)';
    rounded(ctx, W - 150, H - 150, 66, 66, 18); ctx.fill();
    var bars = [[0, 30], [1, 46], [2, 22], [3, 38]];
    bars.forEach(function (b) {
      ctx.fillStyle = [ '#ff54b2', '#35e08c', '#f6b73f', '#4fa3ff' ][b[0]];
      ctx.fillRect(W - 136 + b[0] * 13, H - 100 - b[1], 6, b[1]);
    });

    return cv;
  }

  function open(song, notation) {
    var cv = draw(song, notation);
    var back = document.createElement('div');
    back.className = 'poster-back';
    back.innerHTML =
      '<div class="poster-box" role="dialog" aria-label="Share poster">' +
        '<button class="poster-close" aria-label="Close">×</button>' +
        '<div class="poster-canvas"></div>' +
        '<p class="poster-note">The line is this piece’s own melody — the top note of every column, ' +
        'coloured by octave. Nothing is uploaded; the image is drawn here in your browser.</p>' +
        '<div class="poster-actions">' +
          '<button class="btn btn-primary" data-act="save">↓ Save image</button>' +
          '<button class="btn btn-ghost" data-act="share" hidden>Share…</button>' +
          '<button class="btn btn-ghost" data-act="copy">Copy link</button>' +
        '</div>' +
      '</div>';
    back.querySelector('.poster-canvas').appendChild(cv);
    document.body.appendChild(back);

    var close = function () { back.remove(); document.removeEventListener('keydown', esc); };
    var esc = function (e) { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esc);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    back.querySelector('.poster-close').addEventListener('click', close);

    var file = (song.id || 'doredog') + '-doredog.png';
    var shareBtn = back.querySelector('[data-act="share"]');
    if (navigator.canShare) shareBtn.hidden = false;

    back.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'save') {
        var a = document.createElement('a');
        a.download = file; a.href = cv.toDataURL('image/png'); a.click();
      } else if (act === 'copy') {
        var url = location.origin + '/song?id=' + encodeURIComponent(song.id);
        var done = function () { b.textContent = 'Copied ✓'; setTimeout(function () { b.textContent = 'Copy link'; }, 1400); };
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done); else done();
      } else if (act === 'share') {
        cv.toBlob(function (blob) {
          var f = new File([blob], file, { type: 'image/png' });
          var data = { files: [f], title: song.title, text: song.title + (song.composer ? ' — ' + song.composer : '') };
          if (navigator.canShare(data)) navigator.share(data).catch(function () {});
        });
      }
    });
  }

  global.DRD.poster = { draw: draw, open: open, contour: contour };
})(window);
