// Chinese Checkers (two players) - a self-contained sample game for the HostedGames upload feature.
// 121-hole star, 10 marbles each. Play a friend or the computer (levels 1-10), with last-move highlight,
// Undo, Suggest and per-move commentary.
(function () {
  'use strict';

  var SAVE_KEY = 'hostedgames-chinesecheckers', RED = 1, BLUE = 2, HUMAN = RED, COMPUTER = BLUE;
  var WIN = 1e6, TIMEOUT = { timeout: true }, MAX_PLIES = 400;
  var ROWS = 'abcdefghijklmnopq';
  var LEVELS = [null,
    { depth: 1, width: 40, noise: 60, random: 0.3, name: 'Beginner' },
    { depth: 1, width: 40, noise: 25, random: 0.1, name: 'Novice' },
    { depth: 1, width: 40, noise: 10, name: 'Casual' },
    { depth: 2, width: 10, noise: 6, name: 'Improver' },
    { depth: 2, width: 18, noise: 2, name: 'Club' },
    { depth: 2, width: 30, noise: 0, name: 'Strong club' },
    { depth: 3, width: 14, noise: 0, time: 900, name: 'Expert' },
    { depth: 4, width: 12, noise: 0, time: 1300, name: 'Master' },
    { depth: 5, width: 10, noise: 0, time: 1800, name: 'Grandmaster' },
    { depth: 6, width: 10, noise: 0, time: 2500, name: 'Champion' }];

  // ----- Geometry: axial (q, r) coordinates of the 121-hole star -----
  var cells = [], idxOf = {}, q, r;
  for (r = -8; r <= 8; r++) for (q = -8; q <= 8; q++) {
    var s = -q - r;
    if ((q >= -4 && r >= -4 && s >= -4) || (q <= 4 && r <= 4 && s <= 4)) { idxOf[q + ',' + r] = cells.length; cells.push({ q: q, r: r }); }
  }
  var N = cells.length;
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
  var nb = [], dist = [null, [], []], lat = [], zone = [], labels = [];
  cells.forEach(function (c, i) {
    nb.push(DIRS.map(function (d) { var k = idxOf[(c.q + d[0]) + ',' + (c.r + d[1])]; return k === undefined ? -1 : k; }));
    dist[RED].push(c.r + 8);
    dist[BLUE].push(8 - c.r);
    lat.push(Math.abs(c.q + c.r / 2));
    zone.push(c.r >= 5 ? RED : c.r <= -5 ? BLUE : 0); // starting point of the star
    labels.push(ROWS[8 - c.r] + (2 * c.q + c.r + 13)); // row a-q (bottom to top), column 1-25
  });
  var GOAL = [null, [], []], inGoal = [null, new Uint8Array(N), new Uint8Array(N)];
  for (var i = 0; i < N; i++) {
    if (zone[i] === BLUE) { GOAL[RED].push(i); inGoal[RED][i] = 1; }
    if (zone[i] === RED) { GOAL[BLUE].push(i); inGoal[BLUE][i] = 1; }
  }
  var latPen = lat.map(function (x) { return Math.max(0, x - 1.5) * 4; });

  var boardEl = document.getElementById('board');
  var statusEl = document.getElementById('status');
  var hintEl = document.getElementById('hint');
  var notesEl = document.getElementById('notes');
  var modeEl = document.getElementById('mode');
  var levelEl = document.getElementById('level');
  var levelWrap = document.getElementById('level-wrap');
  var undoBtn = document.getElementById('undo');
  var suggestBtn = document.getElementById('suggest');

  // ----- Position -----
  var board = new Int8Array(N), side = RED, plies = 0;
  function reset() {
    board.fill(0);
    for (var k = 0; k < N; k++) if (zone[k]) board[k] = zone[k];
    side = RED; plies = 0;
  }
  function make(m) { board[m.to] = board[m.from]; board[m.from] = 0; side = 3 - side; plies++; }
  function unmake(m) { board[m.from] = board[m.to]; board[m.to] = 0; side = 3 - side; plies--; }

  function hasWon(p) {
    var g = GOAL[p], own = false;
    for (var k = 0; k < g.length; k++) { if (!board[g[k]]) return false; if (board[g[k]] === p) own = true; }
    return own;
  }

  // All legal moves for p: single steps plus every hole reachable by a chain of jumps.
  function genMoves(p) {
    var out = [];
    for (var from = 0; from < N; from++) {
      if (board[from] !== p) continue;
      var locked = inGoal[p][from], d, t;
      for (d = 0; d < 6; d++) {
        t = nb[from][d];
        if (t >= 0 && !board[t] && (!locked || inGoal[p][t])) out.push({ from: from, to: t, path: [from, t] });
      }
      board[from] = 0;
      var parent = {}, queue = [from];
      parent[from] = -1;
      while (queue.length) {
        var cur = queue.shift();
        for (d = 0; d < 6; d++) {
          var over = nb[cur][d];
          if (over < 0 || !board[over]) continue;
          var land = nb[over][d];
          if (land < 0 || board[land] || parent[land] !== undefined) continue;
          parent[land] = cur;
          queue.push(land);
          if (!locked || inGoal[p][land]) {
            var path = [land], x = cur;
            while (x !== -1) { path.unshift(x); x = parent[x]; }
            out.push({ from: from, to: land, path: path });
          }
        }
      }
      board[from] = p;
    }
    return out;
  }
  function gain(m, p) { return (dist[p][m.from] - dist[p][m.to]) * 10 + latPen[m.from] - latPen[m.to]; }
  function ordered(p, width) {
    var ms = genMoves(p);
    ms.forEach(function (m) { m.g = gain(m, p); });
    ms.sort(function (a, b) { return b.g - a.g; });
    return width ? ms.slice(0, width) : ms;
  }

  // Lower is better: rows still to travel (x10) + drifting to the sides + the straggler.
  function cost(p) {
    var c = 0, worst = 0;
    for (var k = 0; k < N; k++) if (board[k] === p) {
      var d = dist[p][k];
      c += d * 10 + latPen[k];
      if (d > worst) worst = d;
    }
    return c + worst * 3;
  }
  function evaluateRed() { return cost(BLUE) - cost(RED); }

  // ----- Search: width-limited negamax with alpha-beta, iterative deepening and a time limit -----
  var deadline = Infinity, nodes = 0, searchWidth = 12;
  function negamax(depth, alpha, beta, ply) {
    if ((++nodes & 255) === 0 && Date.now() > deadline) throw TIMEOUT;
    if (hasWon(3 - side)) return -(WIN - ply);
    if (plies >= MAX_PLIES) return 0;
    if (depth <= 0) return side === RED ? evaluateRed() : -evaluateRed();
    var moves = ordered(side, searchWidth);
    if (!moves.length) return side === RED ? evaluateRed() : -evaluateRed();
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
    var rootMoves = ordered(side, opts.rootWidth || opts.width * 2);
    if (!rootMoves.length) return null;
    var fullWindow = !!opts.noise, result = null, stopAt = Date.now() + (opts.time || 1000);
    searchWidth = opts.width;
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
      scores.sort(function (a, b) { return b.v - a.v || b.m.g - a.m.g; });
      result = { move: scores[0].m, score: scores[0].v, scores: scores, forced: scores.length === 1, depth: d };
      rootMoves = scores.map(function (x) { return x.m; });
      if (Math.abs(scores[0].v) > WIN / 2) break;
    }
    deadline = Infinity;
    return result;
  }
  function evalMove(m, depth) {
    var v;
    make(m);
    try { v = hasWon(3 - side) ? WIN : -negamax(Math.max(0, depth - 1), -Infinity, Infinity, 1); } finally { unmake(m); }
    return v;
  }
  function computerChoice(level) {
    var L = LEVELS[level], res = searchRoot(L);
    if (!res) return null;
    if (res.forced || res.score > WIN / 2) return res.move;
    var pool = res.scores.filter(function (x) { return x.v > -WIN / 2; });
    if (!pool.length) return res.move;
    if (L.random && Math.random() < L.random) return pool[Math.floor(Math.random() * Math.min(6, pool.length))].m;
    var best = pool[0].m, bestV = -Infinity;
    pool.forEach(function (x) {
      var v = x.v + (Math.random() * 2 - 1) * (L.noise || 0);
      if (v > bestV) { bestV = v; best = x.m; }
    });
    return best;
  }

  // ----- Commentary -----
  function isJump(m) { return m.path.length > 2 || nb[m.from].indexOf(m.to) < 0; }
  function moveText(m) { return m.path.map(function (x) { return labels[x]; }).join(isJump(m) ? '×' : '-'); }
  function sameMove(a, b) { return a.from === b.from && a.to === b.to; }
  function fmtEval(v) {
    if (v > WIN / 2) return 'Red wins';
    if (v < -WIN / 2) return 'Blue wins';
    var x = v / 10;
    return (x >= 0 ? '+' : '') + x.toFixed(1);
  }
  function describe(m) {
    var p = board[m.from] || side, adv = dist[p][m.from] - dist[p][m.to], parts = [];
    var jumps = isJump(m) ? m.path.length - 1 : 0;
    var rows = Math.abs(adv) + ' row' + (Math.abs(adv) === 1 ? '' : 's');
    if (jumps) parts.push((jumps === 1 ? 'jumps' : 'chains ' + jumps + ' jumps') + (adv > 0 ? ', advancing ' + rows : adv < 0 ? ', going back ' + rows : ' sideways'));
    else parts.push(adv > 0 ? 'steps forward' : adv < 0 ? 'steps back' : 'steps sideways');
    if (inGoal[p][m.to] && !inGoal[p][m.from]) parts.push('reaches the far point');
    if (zone[m.from] === p && !zone[m.to]) parts.push('leaves home');
    board[m.to] = p; board[m.from] = 0;
    var won = hasWon(p);
    board[m.from] = p; board[m.to] = 0;
    if (won) parts.push('wins the game');
    var t = parts.join(' and ');
    return t.charAt(0).toUpperCase() + t.slice(1) + '.';
  }
  function grade(loss) {
    if (loss <= 4) return 'Excellent';
    if (loss <= 12) return 'Good';
    if (loss <= 25) return 'Inaccuracy';
    if (loss <= 45) return 'Mistake';
    return 'Blunder';
  }
  function analyse(m) {
    var col = side, sign = col === RED ? 1 : -1, text = describe(m);
    var root = searchRoot({ depth: 2, width: 14, rootWidth: 40, time: 350 });
    if (!root) return { color: col, mv: moveText(m), q: 'Good', ev: fmtEval(0), txt: text };
    var isBest = sameMove(m, root.move);
    var best = root.score, played = isBest ? best : evalMove(m, root.depth);
    if (played > best) best = played;
    var q;
    if (root.forced) q = 'Forced';
    else if (isBest || best - played <= 0) q = 'Best';
    else if (best > WIN / 2 && played < WIN / 2) { q = 'Blunder'; text += ' Missed the winning move.'; }
    else q = grade(best - played);
    if (q !== 'Best' && q !== 'Forced' && q !== 'Excellent') text += ' Better was ' + moveText(root.move) + ': ' + describe(root.move).toLowerCase();
    return { color: col, mv: moveText(m), q: q, ev: fmtEval(played * sign), txt: text };
  }

  // ----- Game state -----
  var history = [], notes = [], selected = -1, hint = null, busy = false;

  function result() {
    if (hasWon(RED)) return RED;
    if (hasWon(BLUE)) return BLUE;
    if (plies >= MAX_PLIES) return -1;
    return 0;
  }
  function isOver() { return result() !== 0; }
  function computerToMove() { return modeEl.value === 'ai' && side === COMPUTER && !isOver(); }
  function clearUi() { selected = -1; hint = null; hintEl.textContent = ''; }

  function playMove(m) {
    var note = analyse(m);
    make(m);
    history.push({ from: m.from, to: m.to, path: m.path });
    notes.push(note);
    clearUi();
  }
  function passIfStuck() {
    // A side with no legal move (extremely rare) passes.
    if (!isOver() && !genMoves(side).length) { side = 3 - side; plies++; history.push({ pass: true }); notes.push({ color: 3 - side, mv: 'pass', q: 'Forced', ev: '', txt: 'No legal move — turn passes.' }); }
  }
  function maybeComputer() {
    if (!computerToMove() || busy) return;
    busy = true;
    render();
    setTimeout(function () {
      try {
        var m = computerChoice(+levelEl.value);
        if (m) playMove(m);
        passIfStuck();
      } catch (e) { console.error('Computer move failed', e); }
      busy = false;
      save();
      render();
    }, 60);
  }

  function onHole(x) {
    if (busy || isOver() || computerToMove()) return;
    if (board[x] === side) { selected = selected === x ? -1 : x; render(); return; }
    if (selected < 0 || board[x]) return;
    var m = genMoves(side).filter(function (g) { return g.from === selected && g.to === x; })[0];
    if (!m) return;
    busy = true;
    board[x] = side; board[selected] = 0; // show the marble moving while the move is graded
    var from = selected;
    selected = -1;
    statusEl.textContent = 'Grading your move…';
    render(true);
    board[from] = board[x]; board[x] = 0;
    setTimeout(function () {
      try { playMove(m); passIfStuck(); } catch (e) { console.error('Move failed', e); }
      busy = false;
      save();
      render();
      maybeComputer();
    }, 20);
  }

  function undoOne() {
    var m = history.pop();
    notes.pop();
    if (m.pass) { side = 3 - side; plies--; } else unmake(m);
  }
  function undo() {
    if (busy || !history.length) return;
    do { undoOne(); } while (modeEl.value === 'ai' && history.length && side !== HUMAN);
    clearUi();
    save();
    render();
  }

  function suggest() {
    if (busy || isOver() || computerToMove()) return;
    busy = true;
    selected = -1;
    statusEl.textContent = 'Looking for the best move…';
    render(true);
    setTimeout(function () {
      try {
        var res = searchRoot({ depth: 5, width: 10, rootWidth: 40, time: 1500 });
        if (res) {
          hint = res.move;
          hintEl.textContent = 'Suggestion: ' + moveText(res.move) + ' — ' + describe(res.move).toLowerCase() +
            ' (eval ' + fmtEval(res.score * (side === RED ? 1 : -1)) + ')';
        }
      } catch (e) { console.error('Suggest failed', e); }
      busy = false;
      render();
    }, 30);
  }

  function newGame() {
    reset();
    history = []; notes = []; busy = false;
    clearUi();
    save();
    render();
    maybeComputer();
  }

  // ----- Rendering -----
  function render(keepStatus) {
    var last = history[history.length - 1], over = isOver();
    var playable = !busy && !over && !computerToMove(), targets = [];
    if (playable && selected >= 0) genMoves(side).forEach(function (m) { if (m.from === selected) targets.push(m.to); });
    var lastPath = last && !last.pass ? last.path : [];
    boardEl.innerHTML = '';
    for (var k = 0; k < N; k++) {
      var c = cells[k], el = document.createElement('div'), cls = 'hole';
      if (zone[k]) cls += ' zone-' + zone[k];
      if (targets.indexOf(k) >= 0) cls += ' target open';
      if (playable && board[k] === side) cls += ' mine';
      if (k === selected) cls += ' selected';
      if (lastPath.indexOf(k) > 0 && k !== last.to) cls += ' path';
      if (last && !last.pass && (k === last.from || k === last.to)) cls += ' last';
      if (hint && (k === hint.from || k === hint.to)) cls += ' hint';
      el.className = cls;
      el.style.left = (50 + (c.q + c.r / 2) * 6.6) + '%';
      el.style.top = (50 + c.r * 5.716) + '%';
      el.title = labels[k];
      el.dataset.i = k;
      if (board[k]) {
        var mb = document.createElement('div');
        mb.className = 'marble p' + board[k];
        el.appendChild(mb);
      }
      el.addEventListener('click', onHole.bind(null, k));
      boardEl.appendChild(el);
    }
    levelWrap.style.display = modeEl.value === 'ai' ? '' : 'none';
    undoBtn.disabled = busy || !history.length;
    suggestBtn.disabled = busy || over || computerToMove();

    if (!keepStatus) {
      var res = result(), name = side === RED ? 'Red' : 'Blue';
      if (res === -1) statusEl.textContent = 'Draw — move limit reached.';
      else if (res) statusEl.textContent = (res === RED ? 'Red' : 'Blue') + ' wins!';
      else if (computerToMove()) statusEl.textContent = 'Computer (Blue) is thinking…';
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
      mv.className = 'mv'; mv.textContent = (k + 1) + '. ' + (n.color === RED ? '🔴' : '🔵') + ' ' + n.mv;
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
        var h = saved.history[k];
        if (isOver() || !h) break;
        if (h.pass) { side = 3 - side; plies++; history.push({ pass: true }); continue; }
        var m = genMoves(side).filter(function (g) { return g.from === h.from && g.to === h.to; })[0];
        if (!m) break;
        make(m);
        history.push({ from: m.from, to: m.to, path: m.path });
      }
      notes = Array.isArray(saved.notes) ? saved.notes.slice(0, history.length) : [];
    } catch (e) { console.error('Could not restore Chinese Checkers game', e); }
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

  reset();
  load();
  render();
  maybeComputer();
})();
