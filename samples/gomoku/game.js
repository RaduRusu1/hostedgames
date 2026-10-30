// Gomoku (five in a row) - a self-contained sample game for the HostedGames upload feature.
// 15x15 board, Black moves first, five or more in a row wins. Play a friend or the computer (levels 1-10),
// with Undo, Suggest and per-move strength commentary.
(function () {
  'use strict';

  var N = 15, SIZE = N * N, CENTER = 7 * N + 7, SAVE_KEY = 'hostedgames-gomoku';
  var BLACK = 1, WHITE = 2, HUMAN = BLACK, COMPUTER = WHITE;
  var WIN = 1e8, TIMEOUT = { timeout: true };
  // Value of a 5-cell window holding k stones of one colour and none of the other.
  var WEIGHT = [0, 2, 20, 200, 2500, 100000];
  var LETTERS = 'ABCDEFGHIJKLMNO';
  var LEVELS = [null,
    { depth: 1, width: 8, noise: 4000, random: 0.35, name: 'Beginner' },
    { depth: 1, width: 10, noise: 1500, random: 0.15, name: 'Novice' },
    { depth: 1, width: 12, noise: 500, name: 'Casual' },
    { depth: 2, width: 10, noise: 250, name: 'Improver' },
    { depth: 2, width: 14, noise: 80, name: 'Club' },
    { depth: 3, width: 10, noise: 20, name: 'Strong club' },
    { depth: 3, width: 14, noise: 0, name: 'Expert' },
    { depth: 4, width: 10, noise: 0, time: 1200, name: 'Master' },
    { depth: 5, width: 10, noise: 0, time: 1600, name: 'Grandmaster' },
    { depth: 6, width: 12, noise: 0, time: 2200, name: 'Champion' }];

  var boardEl = document.getElementById('board');
  var statusEl = document.getElementById('status');
  var hintEl = document.getElementById('hint');
  var notesEl = document.getElementById('notes');
  var modeEl = document.getElementById('mode');
  var levelEl = document.getElementById('level');
  var levelWrap = document.getElementById('level-wrap');
  var undoBtn = document.getElementById('undo');
  var suggestBtn = document.getElementById('suggest');

  // ----- Precomputed geometry: every 5-cell window and the windows through each cell -----
  var wins = [], cellWins = [], nearCells = [], i, r, c;
  for (i = 0; i < SIZE; i++) { cellWins.push([]); nearCells.push([]); }
  var DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
    DIRS.forEach(function (d) {
      var er = r + 4 * d[0], ec = c + 4 * d[1];
      if (er < 0 || er >= N || ec < 0 || ec >= N) return;
      var cells = [];
      for (var k = 0; k < 5; k++) cells.push((r + k * d[0]) * N + c + k * d[1]);
      var id = wins.length;
      wins.push(cells);
      cells.forEach(function (x) { cellWins[x].push(id); });
    });
    for (var dr = -2; dr <= 2; dr++) for (var dc = -2; dc <= 2; dc++) {
      var nr = r + dr, nc = c + dc;
      if ((dr || dc) && nr >= 0 && nr < N && nc >= 0 && nc < N) nearCells[r * N + c].push(nr * N + nc);
    }
  }
  var NW = wins.length;

  // ----- Position (incrementally updated) -----
  var board = new Int8Array(SIZE), near = new Int16Array(SIZE);
  var cnt = [null, new Int8Array(NW), new Int8Array(NW)];
  var evalB = 0; // static evaluation, positive favours Black

  function winVal(w) {
    var b = cnt[BLACK][w], wh = cnt[WHITE][w];
    if (b && wh) return 0;
    return b ? WEIGHT[b] : wh ? -WEIGHT[wh] : 0;
  }
  function place(idx, col) {
    board[idx] = col;
    var ws = cellWins[idx];
    for (var k = 0; k < ws.length; k++) { evalB -= winVal(ws[k]); cnt[col][ws[k]]++; evalB += winVal(ws[k]); }
    var nb = nearCells[idx];
    for (k = 0; k < nb.length; k++) near[nb[k]]++;
  }
  function unplace(idx) {
    var col = board[idx], ws = cellWins[idx];
    for (var k = 0; k < ws.length; k++) { evalB -= winVal(ws[k]); cnt[col][ws[k]]--; evalB += winVal(ws[k]); }
    var nb = nearCells[idx];
    for (k = 0; k < nb.length; k++) near[nb[k]]--;
    board[idx] = 0;
  }

  // Move-ordering heuristic: attack value + defence value of playing idx for col.
  function heuristic(idx, col) {
    var o = 3 - col, a = 0, d = 0, ws = cellWins[idx];
    for (var k = 0; k < ws.length; k++) {
      var my = cnt[col][ws[k]], op = cnt[o][ws[k]];
      if (!op) a += WEIGHT[my + 1] - WEIGHT[my];
      if (!my) d += WEIGHT[op + 1] - WEIGHT[op];
    }
    return a + d * 0.9;
  }
  function candidates(col, width) {
    var list = [];
    for (var k = 0; k < SIZE; k++) if (!board[k] && near[k] > 0) list.push({ m: k, h: heuristic(k, col) });
    if (!list.length) return board[CENTER] ? [] : [CENTER];
    list.sort(function (a, b) { return b.h - a.h; });
    return list.slice(0, width).map(function (x) { return x.m; });
  }
  // Empty cells that would complete five for col.
  function fourCells(col) {
    var out = [], o = 3 - col;
    for (var w = 0; w < NW; w++) {
      if (cnt[col][w] !== 4 || cnt[o][w]) continue;
      var cells = wins[w];
      for (var k = 0; k < 5; k++) if (!board[cells[k]] && out.indexOf(cells[k]) < 0) out.push(cells[k]);
    }
    return out;
  }

  // ----- Search: negamax with alpha-beta, iterative deepening and a time limit -----
  var searchWidth = 10, deadline = Infinity, nodes = 0;
  function negamax(depth, alpha, beta, col, ply) {
    if ((++nodes & 1023) === 0 && Date.now() > deadline) throw TIMEOUT;
    if (fourCells(col).length) return WIN - ply;
    var theirs = fourCells(3 - col);
    if (depth <= 0) {
      if (theirs.length > 1) return -(WIN - ply - 1);
      return col === BLACK ? evalB : -evalB;
    }
    var moves = theirs.length ? theirs : candidates(col, searchWidth);
    if (!moves.length) return 0;
    var best = -Infinity;
    for (var k = 0; k < moves.length; k++) {
      var v;
      place(moves[k], col);
      try { v = -negamax(depth - 1, -beta, -alpha, 3 - col, ply + 1); } finally { unplace(moves[k]); }
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }

  // Returns { move, score, scores, forced, depth } from col's point of view.
  function searchRoot(col, opts) {
    var mine = fourCells(col);
    if (mine.length) return { move: mine[0], score: WIN, scores: [{ m: mine[0], v: WIN }], forced: false, depth: 1 };
    var theirs = fourCells(3 - col);
    var rootMoves = theirs.length ? theirs.slice() : candidates(col, opts.width);
    if (!rootMoves.length) return null;
    var fullWindow = !!opts.noise, result = null, stopAt = Date.now() + (opts.time || 1000);
    searchWidth = opts.width;
    for (var d = 1; d <= opts.depth; d++) {
      deadline = d === 1 ? Infinity : stopAt; // depth 1 always completes
      var scores = [], alpha = -Infinity;
      try {
        for (var k = 0; k < rootMoves.length; k++) {
          var m = rootMoves[k], v;
          place(m, col);
          try { v = -negamax(d - 1, -Infinity, fullWindow ? Infinity : -alpha, 3 - col, 1); } finally { unplace(m); }
          scores.push({ m: m, v: v });
          if (v > alpha) alpha = v;
        }
      } catch (e) {
        if (e !== TIMEOUT) throw e;
        break;
      }
      scores.sort(function (a, b) { return b.v - a.v; });
      result = { move: scores[0].m, score: scores[0].v, scores: scores, forced: theirs.length === 1, depth: d };
      rootMoves = scores.map(function (s) { return s.m; });
      if (Math.abs(scores[0].v) > WIN / 2) break;
    }
    deadline = Infinity;
    return result;
  }

  function evalMove(m, col, depth) {
    var v;
    place(m, col);
    try {
      if (cellWins[m].some(function (w) { return cnt[col][w] === 5; })) v = WIN;
      else v = -negamax(Math.max(0, depth - 1), -Infinity, Infinity, 3 - col, 1);
    } finally { unplace(m); }
    return v;
  }

  function computerChoice(col, level) {
    var L = LEVELS[level];
    var res = searchRoot(col, L);
    if (!res) return null;
    if (res.forced || res.score > WIN / 2 || res.scores.length === 1) return res.move;
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
  function label(idx) { return LETTERS[idx % N] + (N - Math.floor(idx / N)); }
  function fmtEval(v) {
    if (v > WIN / 2) return 'Black wins';
    if (v < -WIN / 2) return 'White wins';
    var x = v / 100;
    return (x >= 0 ? '+' : '') + x.toFixed(1);
  }
  // What playing m does for col (call before the stone is placed).
  function describe(m, col) {
    var o = 3 - col, five = false, fours = 0, threes = 0, blockFour = false, blockThree = 0, ws = cellWins[m];
    for (var k = 0; k < ws.length; k++) {
      var my = cnt[col][ws[k]], op = cnt[o][ws[k]];
      if (!op) { if (my === 4) five = true; else if (my === 3) fours++; else if (my === 2) threes++; }
      if (!my) { if (op === 4) blockFour = true; else if (op === 3) blockThree++; }
    }
    var parts = [];
    if (five) return 'Five in a row — wins the game!';
    if (blockFour) parts.push('blocks a four');
    if (fours >= 2) parts.push('makes an open four that cannot be stopped');
    else if (fours === 1 && threes >= 2) parts.push('makes a four-three double threat');
    else if (fours === 1) parts.push('makes a four, forcing a block');
    else if (threes >= 2) parts.push('builds a three');
    if (!blockFour && blockThree >= 2) parts.push('blocks a three');
    if (!parts.length) parts.push(m === CENTER && !near[m] ? 'takes the centre' : 'develops near the action');
    var s = parts.join(' and ');
    return s.charAt(0).toUpperCase() + s.slice(1) + '.';
  }

  function grade(loss) {
    if (loss <= 60) return 'Excellent';
    if (loss <= 250) return 'Good';
    if (loss <= 800) return 'Inaccuracy';
    if (loss <= 2500) return 'Mistake';
    return 'Blunder';
  }

  function analyse(m, col) {
    var sign = col === BLACK ? 1 : -1;
    var text = describe(m, col);
    var root = searchRoot(col, { depth: 3, width: 9, time: 350 });
    if (!root) return { color: col, mv: label(m), q: 'Good', ev: fmtEval(0), txt: text };
    var best = root.score, played = m === root.move ? best : evalMove(m, col, root.depth);
    if (played > best) best = played;
    var q;
    if (root.forced && m === root.move) q = 'Forced';
    else if (m === root.move || best - played <= 0) q = 'Best';
    else if (best > WIN / 2 && played < WIN / 2) { q = 'Blunder'; text += ' Missed a winning move.'; }
    else if (played < -WIN / 2 && best > -WIN / 2) { q = 'Blunder'; text += ' This allows a forced win.'; }
    else q = grade(best - played);
    if (q !== 'Best' && q !== 'Forced' && q !== 'Excellent') text += ' Better was ' + label(root.move) + ': ' + describe(root.move, col).toLowerCase();
    return { color: col, mv: label(m), q: q, ev: fmtEval(played * sign), txt: text };
  }

  // ----- Game state -----
  var moves = [], notes = [], winner = 0, winLine = [], hintIdx = -1, busy = false;

  function turnColor() { return moves.length % 2 === 0 ? BLACK : WHITE; }
  function isOver() { return winner !== 0 || moves.length === SIZE; }
  function computerToMove() { return modeEl.value === 'ai' && turnColor() === COMPUTER && !isOver(); }

  function collectLine(m, col) {
    var rr = Math.floor(m / N), cc = m % N;
    for (var d = 0; d < 4; d++) {
      var line = [m];
      [1, -1].forEach(function (s) {
        var nr = rr + s * DIRS[d][0], nc = cc + s * DIRS[d][1];
        while (nr >= 0 && nr < N && nc >= 0 && nc < N && board[nr * N + nc] === col) {
          line.push(nr * N + nc); nr += s * DIRS[d][0]; nc += s * DIRS[d][1];
        }
      });
      if (line.length >= 5) return line;
    }
    return [];
  }

  function playMove(m) {
    var col = turnColor();
    var note = analyse(m, col);
    place(m, col);
    moves.push(m);
    notes.push(note);
    hintIdx = -1;
    hintEl.textContent = '';
    var line = collectLine(m, col);
    if (line.length) { winner = col; winLine = line; }
  }

  function newGame() {
    while (moves.length) unplace(moves.pop());
    notes = []; winner = 0; winLine = []; hintIdx = -1; busy = false;
    hintEl.textContent = '';
    save();
    render();
    maybeComputer();
  }

  function maybeComputer() {
    if (!computerToMove() || busy) return;
    busy = true;
    render();
    setTimeout(function () {
      try {
        var m = computerChoice(COMPUTER, +levelEl.value);
        if (m != null && m >= 0) playMove(m);
      } catch (e) { console.error('Computer move failed', e); }
      busy = false;
      save();
      render();
    }, 60);
  }

  function onPoint(idx) {
    if (busy || isOver() || board[idx] || computerToMove()) return;
    busy = true;
    place(idx, turnColor()); // show the stone immediately while the move is graded
    render();
    unplace(idx);
    setTimeout(function () {
      try { playMove(idx); } catch (e) { console.error('Move failed', e); }
      busy = false;
      save();
      render();
      maybeComputer();
    }, 20);
  }

  function undo() {
    if (busy || !moves.length) return;
    do {
      unplace(moves.pop());
      notes.pop();
    } while (modeEl.value === 'ai' && moves.length && turnColor() !== HUMAN);
    winner = 0; winLine = []; hintIdx = -1;
    hintEl.textContent = '';
    save();
    render();
  }

  function suggest() {
    if (busy || isOver() || computerToMove()) return;
    busy = true;
    statusEl.textContent = 'Looking for the best move…';
    render(true);
    setTimeout(function () {
      try {
        var col = turnColor();
        var res = searchRoot(col, { depth: 5, width: 10, time: 1500 });
        if (res) {
          hintIdx = res.move;
          hintEl.textContent = 'Suggestion: ' + label(res.move) + ' — ' + describe(res.move, col).toLowerCase() +
            ' (eval ' + fmtEval(res.score * (col === BLACK ? 1 : -1)) + ')';
        }
      } catch (e) { console.error('Suggest failed', e); }
      busy = false;
      render();
    }, 30);
  }

  // ----- Rendering -----
  function render(keepStatus) {
    var frag = document.createDocumentFragment(), last = moves[moves.length - 1];
    var playable = !busy && !isOver() && !computerToMove();
    for (var k = 0; k < SIZE; k++) {
      var rr = Math.floor(k / N), cc = k % N, pt = document.createElement('div');
      var cls = 'pt';
      if (cc === 0) cls += ' el';
      if (cc === N - 1) cls += ' er';
      if (rr === 0) cls += ' et';
      if (rr === N - 1) cls += ' eb';
      if (!board[k] && playable) cls += ' open';
      if (k === hintIdx && !board[k]) cls += ' hint';
      if (k === last) cls += ' last';
      if (winLine.indexOf(k) >= 0) cls += ' win';
      pt.className = cls;
      pt.dataset.i = k;
      pt.title = label(k);
      if (board[k]) {
        var st = document.createElement('div');
        st.className = 'stone ' + (board[k] === BLACK ? 'b' : 'w');
        pt.appendChild(st);
      }
      frag.appendChild(pt);
    }
    boardEl.innerHTML = '';
    boardEl.appendChild(frag);

    levelWrap.style.display = modeEl.value === 'ai' ? '' : 'none';
    undoBtn.disabled = busy || !moves.length;
    suggestBtn.disabled = busy || isOver() || computerToMove();

    if (!keepStatus) {
      var name = turnColor() === BLACK ? 'Black' : 'White';
      if (winner) statusEl.textContent = (winner === BLACK ? 'Black' : 'White') + ' wins with five in a row!';
      else if (moves.length === SIZE) statusEl.textContent = 'Board full — draw.';
      else if (computerToMove()) statusEl.textContent = 'Computer (White) is thinking…';
      else if (busy) statusEl.textContent = 'Grading your move…';
      else statusEl.textContent = name + ' to move' + (modeEl.value === 'ai' ? ' (you)' : '');
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
      mv.className = 'mv'; mv.textContent = (k + 1) + '. ' + (n.color === BLACK ? '●' : '○') + ' ' + n.mv;
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
      localStorage.setItem(SAVE_KEY, JSON.stringify({ moves: moves, notes: notes, mode: modeEl.value, level: levelEl.value }));
    } catch (e) { /* storage unavailable */ }
  }
  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!saved || !Array.isArray(saved.moves)) return false;
      modeEl.value = saved.mode === 'human' ? 'human' : 'ai';
      if (saved.level >= 1 && saved.level <= 10) levelEl.value = String(saved.level);
      for (var k = 0; k < saved.moves.length; k++) {
        var m = saved.moves[k];
        if (typeof m !== 'number' || m < 0 || m >= SIZE || board[m]) break;
        var col = turnColor();
        place(m, col);
        moves.push(m);
        var line = collectLine(m, col);
        if (line.length) { winner = col; winLine = line; break; }
      }
      notes = Array.isArray(saved.notes) ? saved.notes.slice(0, moves.length) : [];
      return true;
    } catch (e) { console.error('Could not restore gomoku game', e); }
    return false;
  }

  // ----- Wire up -----
  for (var lv = 1; lv <= 10; lv++) {
    var opt = document.createElement('option');
    opt.value = String(lv);
    opt.textContent = lv + ' — ' + LEVELS[lv].name;
    levelEl.appendChild(opt);
  }
  levelEl.value = '5';
  boardEl.addEventListener('click', function (e) {
    var pt = e.target.closest('.pt');
    if (pt) onPoint(+pt.dataset.i);
  });
  undoBtn.addEventListener('click', undo);
  suggestBtn.addEventListener('click', suggest);
  document.getElementById('restart').addEventListener('click', newGame);
  modeEl.addEventListener('change', function () { hintIdx = -1; hintEl.textContent = ''; save(); render(); maybeComputer(); });
  levelEl.addEventListener('change', save);

  load();
  render();
  maybeComputer();
})();
