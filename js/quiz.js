/* ============================================================================
   DoReDog quizzes — question generators + the game loop.

   Modes:
     round    — a fixed set of questions, then a score
     endless  — keeps going while you're right; one wrong answer ends the run
   Question types are generated from the live catalogue (2,400+ pieces), so the
   supply never runs out and nothing needs hand-authoring.
   ========================================================================== */
(function (global) {
  'use strict';
  var DRD = global.DRD || {};
  var NOTA_V = 89;

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function sample(a, n) { return shuffle(a).slice(0, n); }
  function songs() { return (DRD.SONGS || []); }

  // pieces recognisable enough to be worth guessing by ear
  var FAMOUS = ['fur-elise','moonlight-sonata','canon-in-d','clair-de-lune','gymnopedie-no-1',
    'rondo-alla-turca','the-entertainer','nocturne-op-9-no-2','ave-maria','prelude-in-c',
    'ode-to-joy','twinkle-twinkle','silent-night','jingle-bells','happy-birthday',
    'air-on-the-g-string','blue-danube','hall-of-the-mountain-king','maple-leaf-rag','swan-lake',
    'wedding-march','sugar-plum-fairy','humoresque-7','liebestraum-3','raindrop-prelude',
    'arabesque-1','flight-of-the-bumblebee','minuet-in-g','morning-mood','waltz-of-the-flowers',
    'amazing-grace','o-christmas-tree','we-three-kings','row-row-row-your-boat','pop-goes-the-weasel',
    'gnossienne-no-1','fantaisie-impromptu','toccata-and-fugue','eine-kleine-nachtmusik','carmen-habanera'];

  function famousSongs() {
    return FAMOUS.map(function (id) { return DRD.getSong && DRD.getSong(id); }).filter(Boolean);
  }

  /* ---------------------------------------------------------------- helpers */
  function letterName(song) { return song.title; }
  function composerOf(song) { return song.composer || ''; }

  // notation snippet for "read the letter notes" questions
  function firstNotes(notation, n) {
    var out = [];
    var lines = String(notation).split('\n');
    for (var i = 0; i < lines.length && out.length < n; i++) {
      var m = lines[i].match(/^(?:RH|LH)?\s*(-?\d+)\|(.*?)\|?$/);
      if (!m) continue;
      for (var c = 0; c < m[2].length && out.length < n; c++) {
        var ch = m[2][c];
        if (/[a-gA-G]/.test(ch)) out.push(ch);
      }
    }
    return out;
  }

  /* ------------------------------------------------------- question makers */
  // 1. hear a melody, name the piece
  function qNameThatTune() {
    var pool = famousSongs(); if (pool.length < 4) return null;
    var target = sample(pool, 1)[0];
    var others = sample(pool.filter(function (s) { return s.id !== target.id; }), 3);
    return {
      kind: 'audio', songId: target.id, prompt: 'Which piece is this?',
      options: shuffle([target].concat(others)).map(function (s) {
        return { key: s.id, label: s.title, sub: composerOf(s) };
      }),
      answer: target.id,
      truth: 'It was <a href="song?id=' + target.id + '"><b>' + target.title + '</b></a>' +
             (/^Traditional/.test(composerOf(target)) ? ' — a traditional melody'
               : composerOf(target) ? ' by ' + composerOf(target) : '') + '.'
    };
  }

  // 2. hear a melody, name the composer
  function qWhoWroteIt() {
    var pool = famousSongs().filter(function (s) { return s.composer && !/^Traditional/.test(s.composer); });
    var names = [];
    pool.forEach(function (s) { if (names.indexOf(s.composer) < 0) names.push(s.composer); });
    if (names.length < 4) return null;
    var target = sample(pool, 1)[0];
    var others = sample(names.filter(function (n) { return n !== target.composer; }), 3);
    return {
      kind: 'audio', songId: target.id, prompt: 'Who wrote this?',
      options: shuffle([target.composer].concat(others)).map(function (n) { return { key: n, label: n }; }),
      answer: target.composer,
      truth: 'It was <b>' + target.composer + '</b> — <a href="song?id=' + target.id + '">' + target.title + '</a>.'
    };
  }

  // 3. read the letter notes — which piece opens like this?
  function qReadTheNotes() {
    var pool = famousSongs(); if (pool.length < 4) return null;
    var target = sample(pool, 1)[0];
    var others = sample(pool.filter(function (s) { return s.id !== target.id; }), 3);
    return {
      kind: 'notes', songId: target.id, prompt: 'Which piece starts with these letter notes?',
      options: shuffle([target].concat(others)).map(function (s) {
        return { key: s.id, label: s.title, sub: composerOf(s) };
      }),
      answer: target.id,
      truth: 'These are the opening notes of <a href="song?id=' + target.id + '"><b>' + target.title + '</b></a>.'
    };
  }

  // 4. which of these is the easiest to learn? (uses the catalogue's difficulty)
  function qWhichIsEasiest() {
    var easy = songs().filter(function (s) { return s.difficulty === 'easy' && s.composer; });
    var hard = songs().filter(function (s) { return s.difficulty === 'hard' && s.composer; });
    if (!easy.length || hard.length < 3) return null;
    var target = sample(easy, 1)[0], others = sample(hard, 3);
    return {
      kind: 'text', prompt: 'Which of these is rated easiest for a beginner?',
      options: shuffle([target].concat(others)).map(function (s) {
        return { key: s.id, label: s.title, sub: composerOf(s) };
      }),
      answer: target.id,
      truth: '<a href="song?id=' + target.id + '"><b>' + target.title + '</b></a> is the beginner-friendly one — the others are rated hard.'
    };
  }

  // 5. which composer wrote it? (from the catalogue, no audio — pure knowledge)
  function qComposerOfPiece() {
    var pool = famousSongs().filter(function (s) { return s.composer && !/^Traditional/.test(s.composer); });
    var names = [];
    pool.forEach(function (s) { if (names.indexOf(s.composer) < 0) names.push(s.composer); });
    if (names.length < 4) return null;
    var target = sample(pool, 1)[0];
    var others = sample(names.filter(function (n) { return n !== target.composer; }), 3);
    return {
      kind: 'text', prompt: 'Who composed “' + target.title + '”?',
      options: shuffle([target.composer].concat(others)).map(function (n) { return { key: n, label: n }; }),
      answer: target.composer,
      truth: '<b>' + target.composer + '</b> — <a href="song?id=' + target.id + '">hear it here</a>.'
    };
  }

  var MAKERS = {
    tune: qNameThatTune, composer: qWhoWroteIt, notes: qReadTheNotes,
    easiest: qWhichIsEasiest, knowledge: qComposerOfPiece
  };
  var ALL = ['tune', 'composer', 'notes', 'easiest', 'knowledge'];

  function makeQuestion(types) {
    var list = (types && types.length) ? types : ALL;
    for (var tries = 0; tries < 12; tries++) {
      var t = list[Math.floor(Math.random() * list.length)];
      var q = MAKERS[t] && MAKERS[t]();
      if (q) { q.type = t; return q; }
    }
    return null;
  }

  /* -------------------------------------------------------------- notation */
  function loadNotation(id, cb) {
    DRD.NOTATIONS = DRD.NOTATIONS || {};
    if (DRD.NOTATIONS[id]) return cb(DRD.NOTATIONS[id]);
    var sc = document.createElement('script');
    sc.src = 'songs/' + id + '.js?v=' + NOTA_V;
    sc.onload = function () { cb((DRD.NOTATIONS || {})[id] || null); };
    sc.onerror = function () { cb(null); };
    document.head.appendChild(sc);
  }

  global.DRDQuiz = {
    makeQuestion: makeQuestion,
    loadNotation: loadNotation,
    firstNotes: firstNotes,
    TYPES: ALL,
    LABELS: { tune: 'Name that tune', composer: 'Who wrote it?', notes: 'Read the notes',
              easiest: 'Which is easiest?', knowledge: 'Music knowledge' }
  };
})(window);
