// Nine Men's Morris - a self-contained sample game for the HostedGames upload feature.
// Play a friend or the computer (levels 1-10), with last-move highlight, Undo, Suggest and per-move commentary.
(function () {
  'use strict';

  var SAVE_KEY = 'hostedgames-morris', WHITE = 1, BLACK = 2, HUMAN = WHITE, COMPUTER = BLACK;
  var WIN = 1e6, TIMEOUT = { timeout: true }, DRAW_PLIES = 50;
  var POS = [[0, 0], [3, 0], [6, 0], [1, 1], [3, 1], [5, 1], [2, 2], [3, 2], [4, 2], [0, 3], [1, 3], [2, 3],
    [4, 3], [5, 3], [6, 3], [2, 4], [3, 4], [4, 4], [1, 5], [3, 5], [5, 5], [0, 6], [3, 6], [6, 6]];
  var ADJ = [[1, 9], [0, 2, 4], [1, 14], [4, 10], [1, 3, 5, 7], [4, 13], [7, 11], [4, 6, 8], [7, 12], [0, 10, 21],
    [3, 9, 11, 18], [6, 10, 15], [8, 13, 17], [5, 12, 14, 20], [2, 13, 23], [11, 16], [15, 17, 19], [12, 16],
    [10, 19], [16, 18, 20, 22], [13, 19], [9, 22], [19, 21, 23], [14, 22]];
  var MILLS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 13, 14], [15, 16, 17], [18, 19, 20], [21, 22, 23],
    [0, 9, 21], [3, 10, 18], [6, 11, 15], [1, 4, 7], [16, 19, 22], [8, 12, 17], [5, 13, 20], [2, 14, 23]];
  var PT_MILLS = [], p;
  for (p = 0; p < 24; p++) PT_MILLS.push([]);
  MILLS.forEach(function (m, i) { m.forEach(function (x) { PT_MILLS[x].push(i); }); });
  var LEVELS = [null,
    { depth: 1, noise: 160, random: 0.35, name: 'Beginner' },
    { depth: 1, noise: 70, random: 0.15, name: 'Novice' },
    { depth: 2, noise: 45, name: 'Casual' },
    { depth: 2, noise: 18, name: 'Improver' },
    { depth: 3, noise: 8, name: 'Club' },
    { depth: 4, noise: 0, time: 700, name: 'Strong club' },
    { depth: 5, noise: 0, time: 900, name: 'Expert' },
    { depth: 6, noise: 0, time: 1300, name: 'Master' },
    { depth: 7, noise: 0, time: 1800, name: 'Grandmaster' },
    { depth: 9, noise: 0, time: 2500, name: 'Champion' }];

  var pointsEl = document.getElementById('points');
  var statusEl = document.getElementById('status');
  var hintEl = document.getElementById('hint');
  var notesEl = document.getElementById('notes');
  var modeEl = document.getElementById('mode');
  var levelEl = document.getElementById('level');
  var levelWrap = document.getElementById('level-wrap');
  var undoBtn = document.getElementById('undo');
  var suggestBtn = document.getElementById('suggest');
  var handW = document.getElementById('hand-w');
  var handB = document.getElementById('hand-b');

  // ----- Position -----
  var board = new Int8Array(24), hand = [0, 9, 9], count = [0, 0, 0], side = WHITE, quiet = 0, stack = [];

  function label(x) { return 'abcdefg'[POS[x][0]] + (7 - POS[x][1]); }
  function inMill(x, col) {
    var ms = PT_MILLS[x];
    for (var k = 0; k < ms.length; k++) {
      var m = MILLS[ms[k]];
      if (board[m[0]] === col && board[m[1]] === col && board[m[2]] === col) return true;
    }
    return false;
  }
  function removable(col) {
    var all = [], free = [];
    for (var x = 0; x < 24; x++) if (board[x] === col) { all.push(x); if (!inMill(x, col)) free.push(x); }
    return free.length ? free : all;
  }
  function handsEmpty() { return hand[1] === 0 && hand[2] === 0; }

  function make(m) {
    var s = side, o = 3 - s;
    stack.push(quiet);
    if (m.from < 0) { hand[s]--; count[s]++; } else board[m.from] = 0;
    board[m.to] = s;
    if (m.rem >= 0) { board[m.rem] = 0; count[o]--; quiet = 0; } else if (handsEmpty()) quiet++;
    side = o;
  }
  function unmake(m) {
    var s = 3 - side, o = side;
    quiet = stack.pop();
    if (m.rem >= 0) { board[m.rem] = o; count[o]++; }
    board[m.to] = 0;
    if (m.from < 0) { hand[s]++; count[s]--; } else board[m.from] = s;
    side = s;
  }

  function genMoves() {
    var s = side, o = 3 - s, out = [], pairs = [], x, y;
    if (hand[s] > 0) { for (y = 0; y < 24; y++) if (!board[y]) pairs.push(-1, y); }
    else if (count[s] === 3) {
      for (x = 0; x < 24; x++) if (board[x] === s) for (y = 0; y < 24; y++) if (!board[y]) pairs.push(x, y);
    } else {
      for (x = 0; x < 24; x++) if (board[x] === s) ADJ[x].forEach(function (t) { if (!board[t]) pairs.push(x, t); });
    }
    for (var k = 0; k < pairs.length; k += 2) {
      var from = pairs[k], to = pairs[k + 1];
      if (from >= 0) board[from] = 0;
      board[to] = s;
      var mill = inMill(to, s), rems = mill && count[o] > 0 ? removable(o) : null;
      board[to] = 0;
      if (from >= 0) board[from] = s;
      if (rems) rems.forEach(function (r) { out.push({ from: from, to: to, rem: r }); });
      else out.push({ from: from, to: to, rem: -1 });
    }
    return out;
  }

  // Static evaluation from White's point of view.
  function evaluateWhite() {
    var v = ((hand[1] + count[1]) - (hand[2] + count[2])) * 100;
    for (var i = 0; i < MILLS.length; i++) {
      var m = MILLS[i], w = 0, b = 0;
      for (var k = 0; k < 3; k++) { if (board[m[k]] === 1) w++; else if (board[m[k]] === 2) b++; }
      if (w === 3) v += 14; else if (b === 3) v -= 14;
      else if (w === 2 && !b) v += 18; else if (b === 2 && !w) v -= 18;
    }
    if (!hand[1] && count[1] > 3) v += mobility(1) * 4;
    if (!hand[2] && count[2] > 3) v -= mobility(2) * 4;
    return v;
  }
  function mobility(col) {
    var n = 0;
    for (var x = 0; x < 24; x++) if (board[x] === col) for (var k = 0; k < ADJ[x].length; k++) if (!board[ADJ[x][k]]) n++;
    return n;
  }

  // ----- Search -----
  var deadline = Infinity, nodes = 0;
  function order(moves) { return moves.sort(function (a, b) { return (b.rem >= 0) - (a.rem >= 0); }); }
  function negamax(depth, alpha, beta, ply) {
    if ((++nodes & 1023) === 0 && Date.now() > deadline) throw TIMEOUT;
    if (hand[side] + count[side] < 3) return -(WIN - ply);
    if (handsEmpty() && quiet >= DRAW_PLIES) return 0;
    var moves = genMoves();
    if (!moves.length) return -(WIN - ply);
    if (depth <= 0) return side === WHITE ? evaluateWhite() : -evaluateWhite();
    order(moves);
    var best = -Infinity;
    for (var k = 0; k < moves.length; k++) {
      var v;
      make(moves[k]);
      try { v = -negamax(depth - 1, -beta, -alpha, ply + 1); } finally { unmake(moves[k]); }
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }

  // Returns { move, score, scores, forced, depth } from the side-to-move's point of view.
  function searchRoot(opts) {
    var rootMoves = order(genMoves());
    if (!rootMoves.length) return null;
    var fullWindow = !!opts.noise, result = null, stopAt = Date.now() + (opts.time || 1000);
    for (var d = 1; d <= opts.depth; d++) {
      deadline = d === 1 ? Infinity : stopAt;
      var scores = [], alpha = -Infinity;
      try {
        for (var k = 0; k < rootMoves.length; k++) {
          var m = rootMoves[k], v;
          make(m);
          try { v = -negamax(d - 1, -Infinity, fullWindow ? Infinity : -alpha, 1); } finally { unmake(m); }
          scores.push({ m: m, v: v });
          if (v > alpha) alpha = v;
        }
      } catch (e) {
        if (e !== TIMEOUT) throw e;
        break;
      }
      scores.sort(function (a, b) { return b.v - a.v; });
      result = { move: scores[0].m, score: scores[0].v, scores: scores, forced: scores.length === 1, depth: d };
      rootMoves = scores.map(function (s) { return s.m; });
      if (Math.abs(scores[0].v) > WIN / 2) break;
    }
    deadline = Infinity;
    return result;
  }
  function evalMove(m, depth) {
    var v;
    make(m);
    try { v = -negamax(Math.max(0, depth - 1), -Infinity, Infinity, 1); } finally { unmake(m); }
    return v;
  }
  function computerChoice(level) {
    var L = LEVELS[level], res = searchRoot(L);
    if (!res) return null;
    if (res.forced || res.score > WIN / 2) return res.move;
    var pool = res.scores.filter(function (s) { return s.v > -WIN / 2; });
    if (!pool.length) return res.move;
    if (L.random && Math.random() < L.random) return pool[Math.floor(Math.random() * Math.min(5, pool.length))].m;
    var best = pool[0].m, bestV = -Infinity;
    pool.forEach(function (s) {
      var v = s.v + (Math.random() * 2 - 1) * (L.noise || 0);
      if (v > bestV) { bestV = v; best = s.m; }
    });
    return best;
  }

  // ----- Commentary -----
  function moveText(m) {
    return (m.from >= 0 ? label(m.from) + '-' : '') + label(m.to) + (m.rem >= 0 ? 'x' + label(m.rem) : '');
  }
  function sameMove(a, b) { return a.from === b.from && a.to === b.to && a.rem === b.rem; }
  function fmtEval(v) {
    if (v > WIN / 2) return 'White wins';
    if (v < -WIN / 2) return 'Black wins';
    var x = v / 100;
    return (x >= 0 ? '+' : '') + x.toFixed(1);
  }
  // Plain-language description of m for the side to move (call before it is made).
  function describe(m) {
    var s = side, o = 3 - s, parts = [], ms = PT_MILLS[m.to], blocks = false, threat = false;
    ms.forEach(function (i) {
      var mine = 0, theirs = 0;
      MILLS[i].forEach(function (x) { if (x !== m.to) { if (board[x] === o) theirs++; else if (board[x] === s && x !== m.from) mine++; } });
      if (theirs === 2) blocks = true;
      if (mine === 1 && !theirs) threat = true;
    });
    var fly = m.from >= 0 && hand[s] === 0 && count[s] === 3;
    if (m.rem >= 0) parts.push('forms a mill and removes ' + label(m.rem));
    if (blocks) parts.push('blocks a mill');
    if (m.rem < 0 && threat) parts.push('threatens a mill');
    if (m.from >= 0 && inMill(m.from, s)) parts.push('opens a mill to close it again later');
    if (fly && !parts.length) parts.push('flies to ' + label(m.to));
    if (!parts.length) parts.push(m.from < 0 ? 'places a piece on ' + label(m.to) : 'repositions');
    make(m);
    var oppMoves = genMoves().length, oppLeft = hand[side] + count[side];
    unmake(m);
    if (oppLeft < 3 || !oppMoves) parts.push('wins the game');
    var t = parts.join(' and ');
    return t.charAt(0).toUpperCase() + t.slice(1) + '.';
  }
  function grade(loss) {
    if (loss <= 12) return 'Excellent';
    if (loss <= 40) return 'Good';
    if (loss <= 90) return 'Inaccuracy';
    if (loss <= 200) return 'Mistake';
    return 'Blunder';
  }
  function analyse(m) {
    var col = side, sign = col === WHITE ? 1 : -1, text = describe(m);
    var root = searchRoot({ depth: 6, time: 450 });
    if (!root) return { color: col, mv: moveText(m), q: 'Good', ev: fmtEval(0), txt: text };
    var isBest = sameMove(m, root.move);
    var best = root.score, played = isBest ? best : evalMove(m, root.depth);
    if (played > best) best = played;
    var q;
    if (root.forced) q = 'Forced';
    else if (isBest || best - played <= 0) q = 'Best';
    else if (best > WIN / 2 && played < WIN / 2) { q = 'Blunder'; text += ' Missed a forced win.'; }
    else if (played < -WIN / 2 && best > -WIN / 2) { q = 'Blunder'; text += ' This allows a forced loss.'; }
    else q = grade(best - played);
    if (q !== 'Best' && q !== 'Forced' && q !== 'Excellent') text += ' Better was ' + moveText(root.move) + ': ' + describe(root.move).toLowerCase();
    return { color: col, mv: moveText(m), q: q, ev: fmtEval(played * sign), txt: text };
  }

  // ----- Game state -----
  var history = [], notes = [], selected = -1, pending = null, hint = null, busy = false;

  function result() {
    if (hand[side] + count[side] < 3 || !genMoves().length) return 3 - side;
    if (handsEmpty() && quiet >= DRAW_PLIES) return -1;
    return 0;
  }
  function isOver() { return result() !== 0; }
  function computerToMove() { return modeEl.value === 'ai' && side === COMPUTER && !isOver(); }
  function clearUi() { selected = -1; pending = null; hint = null; hintEl.textContent = ''; }

  function playMove(m) {
    var note = analyse(m);
    make(m);
    history.push(m);
    notes.push(note);
    clearUi();
  }
  function finishHumanMove(m) {
    busy = true;
    clearUi();
    statusEl.textContent = 'Grading your move…';
    render(true);
    setTimeout(function () {
      try { playMove(m); } catch (e) { console.error('Move failed', e); }
      busy = false;
      save();
      render();
      maybeComputer();
    }, 20);
  }
  function maybeComputer() {
    if (!computerToMove() || busy) return;
    busy = true;
    render();
    setTimeout(function () {
      try {
        var m = computerChoice(+levelEl.value);
        if (m) playMove(m);
      } catch (e) { console.error('Computer move failed', e); }
      busy = false;
      save();
      render();
    }, 60);
  }

  function onPoint(x) {
    if (busy || isOver() || computerToMove()) return;
    var legal = genMoves(), s = side, cands;
    if (pending) {
      cands = legal.filter(function (m) { return m.from === pending.from && m.to === pending.to && m.rem === x; });
      if (cands.length) finishHumanMove(cands[0]);
      return;
    }
    if (hand[s] === 0 && board[x] === s) { selected = selected === x ? -1 : x; render(); return; }
    if (board[x]) return;
    var from = hand[s] > 0 ? -1 : selected;
    if (hand[s] === 0 && from < 0) return;
    cands = legal.filter(function (m) { return m.from === from && m.to === x; });
    if (!cands.length) return;
    if (cands[0].rem >= 0 && cands.length > 1) {
      pending = { from: from, to: x, rems: cands.map(function (m) { return m.rem; }) };
      render();
      return;
    }
    finishHumanMove(cands[0]);
  }

  function undo() {
    if (busy || !history.length) return;
    do {
      unmake(history.pop());
      notes.pop();
    } while (modeEl.value === 'ai' && history.length && side !== HUMAN);
    clearUi();
    save();
    render();
  }

  function suggest() {
    if (busy || isOver() || computerToMove()) return;
    busy = true;
    pending = null; selected = -1;
    statusEl.textContent = 'Looking for the best move…';
    render(true);
    setTimeout(function () {
      try {
        var res = searchRoot({ depth: 9, time: 1500 });
        if (res) {
          hint = res.move;
          hintEl.textContent = 'Suggestion: ' + moveText(res.move) + ' — ' + describe(res.move).toLowerCase() +
            ' (eval ' + fmtEval(res.score * (side === WHITE ? 1 : -1)) + ')';
        }
      } catch (e) { console.error('Suggest failed', e); }
      busy = false;
      render();
    }, 30);
  }

  function newGame() {
    while (history.length) unmake(history.pop());
    notes = []; busy = false;
    clearUi();
    save();
    render();
    maybeComputer();
  }

  // ----- Rendering -----
  function render(keepStatus) {
    var last = history[history.length - 1], over = isOver();
    var playable = !busy && !over && !computerToMove(), s = side;
    var targets = [];
    if (playable && !pending && hand[s] === 0 && selected >= 0) {
      genMoves().forEach(function (m) { if (m.from === selected && targets.indexOf(m.to) < 0) targets.push(m.to); });
    }
    pointsEl.innerHTML = '';
    for (var x = 0; x < 24; x++) {
      var el = document.createElement('div'), cls = 'pt';
      if (playable && !pending && !board[x] && (hand[s] > 0 || targets.indexOf(x) >= 0)) cls += ' open';
      if (targets.indexOf(x) >= 0) cls += ' target';
      if (playable && !pending && hand[s] === 0 && board[x] === s) cls += ' mine';
      if (x === selected) cls += ' selected';
      if (pending && pending.rems.indexOf(x) >= 0) cls += ' removable';
      if (last && (x === last.to || x === last.from)) cls += ' last';
      if (last && x === last.rem && !board[x]) cls += ' removed';
      if (hint && (x === hint.to || x === hint.from || x === hint.rem)) cls += ' hint';
      if (board[x] && inMill(x, board[x])) cls += ' mill';
      el.className = cls;
      el.style.left = (7.14 + POS[x][0] * 14.29) + '%';
      el.style.top = (7.14 + POS[x][1] * 14.29) + '%';
      el.title = label(x);
      el.dataset.i = x;
      var show = board[x] || (pending && x === pending.to ? s : 0);
      if (pending && x === pending.from) show = 0;
      if (show) {
        var pc = document.createElement('div');
        pc.className = 'piece ' + (show === WHITE ? 'w' : 'b');
        el.appendChild(pc);
      }
      el.addEventListener('click', onPoint.bind(null, x));
      pointsEl.appendChild(el);
    }
    handW.textContent = hand[1];
    handB.textContent = hand[2];
    levelWrap.style.display = modeEl.value === 'ai' ? '' : 'none';
    undoBtn.disabled = busy || !history.length;
    suggestBtn.disabled = busy || over || computerToMove();

    if (!keepStatus) {
      var r = result(), name = s === WHITE ? 'White' : 'Black';
      if (r === -1) statusEl.textContent = 'Draw — 50 moves without a capture.';
      else if (r) statusEl.textContent = (r === WHITE ? 'White' : 'Black') + ' wins!';
      else if (computerToMove()) statusEl.textContent = 'Computer (Black) is thinking…';
      else if (pending) statusEl.textContent = 'Mill! Choose a ' + (s === WHITE ? 'black' : 'white') + ' piece to remove.';
      else if (hand[s] > 0) statusEl.textContent = name + ' to place' + (modeEl.value === 'ai' ? ' (you)' : '');
      else statusEl.textContent = name + ' to move' + (count[s] === 3 ? ' — flying' : '') + (modeEl.value === 'ai' ? ' (you)' : '');
    }
    renderNotes();
  }

  function renderNotes() {
    notesEl.innerHTML = '';
    if (!notes.length) {
      var empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = 'Each move will be graded here.';
      notesEl.appendChild(empty);
      return;
    }
    for (var k = notes.length - 1; k >= 0; k--) {
      var n = notes[k], li = document.createElement('li');
      var mv = document.createElement('span'), q = document.createElement('span');
      var ev = document.createElement('span'), txt = document.createElement('span');
      mv.className = 'mv'; mv.textContent = (k + 1) + '. ' + (n.color === WHITE ? '○' : '●') + ' ' + n.mv;
      q.className = 'q q-' + n.q.toLowerCase(); q.textContent = n.q;
      ev.className = 'ev'; ev.textContent = n.ev;
      txt.className = 'txt'; txt.textContent = n.txt;
      li.appendChild(mv); li.appendChild(q); li.appendChild(ev); li.appendChild(txt);
      notesEl.appendChild(li);
    }
  }

  // ----- Persistence -----
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ history: history, notes: notes, mode: modeEl.value, level: levelEl.value }));
    } catch (e) { /* storage unavailable */ }
  }
  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!saved || !Array.isArray(saved.history)) return;
      modeEl.value = saved.mode === 'human' ? 'human' : 'ai';
      if (saved.level >= 1 && saved.level <= 10) levelEl.value = String(saved.level);
      for (var k = 0; k < saved.history.length; k++) {
        var m = saved.history[k];
        if (isOver() || !m || !genMoves().some(function (g) { return sameMove(g, m); })) break;
        make(m);
        history.push({ from: m.from, to: m.to, rem: m.rem });
      }
      notes = Array.isArray(saved.notes) ? saved.notes.slice(0, history.length) : [];
    } catch (e) { console.error('Could not restore Nine Men\'s Morris game', e); }
  }

  // ----- Wire up -----
  for (var lv = 1; lv <= 10; lv++) {
    var opt = document.createElement('option');
    opt.value = String(lv);
    opt.textContent = lv + ' — ' + LEVELS[lv].name;
    levelEl.appendChild(opt);
  }
  levelEl.value = '5';
  undoBtn.addEventListener('click', undo);
  suggestBtn.addEventListener('click', suggest);
  document.getElementById('restart').addEventListener('click', newGame);
  modeEl.addEventListener('change', function () { clearUi(); save(); render(); maybeComputer(); });
  levelEl.addEventListener('change', save);

  load();
  render();
  maybeComputer();
})();
