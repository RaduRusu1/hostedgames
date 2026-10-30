// Checkers (English draughts) - a self-contained sample game for the HostedGames upload feature.
// Pieces: 'r' / 'b' men, 'R' / 'B' kings. Red starts at the bottom and moves first.
// Play a friend or the computer (levels 1-10), with Undo, Suggest and per-move strength commentary.
(function () {
  'use strict';

  var boardEl = document.getElementById('board');
  var statusEl = document.getElementById('status');
  var hintEl = document.getElementById('hint');
  var notesEl = document.getElementById('notes');
  var modeEl = document.getElementById('mode');
  var levelEl = document.getElementById('level');
  var levelWrap = document.getElementById('level-wrap');
  var undoBtn = document.getElementById('undo');
  var suggestBtn = document.getElementById('suggest');
  var SAVE_KEY = 'hostedgames-checkers';
  var WIN = 10000;
  // Search depth (plies) and random noise per computer level.
  var LEVELS = [null,
    { depth: 1, noise: 120, name: 'Beginner' },
    { depth: 1, noise: 60, name: 'Novice' },
    { depth: 2, noise: 40, name: 'Casual' },
    { depth: 2, noise: 20, name: 'Improver' },
    { depth: 3, noise: 10, name: 'Club' },
    { depth: 4, noise: 5, name: 'Strong club' },
    { depth: 5, noise: 0, name: 'Expert' },
    { depth: 6, noise: 0, name: 'Master' },
    { depth: 7, noise: 0, name: 'Grandmaster' },
    { depth: 8, noise: 0, name: 'Champion' }];

  var state, selected = null, history = [], notes = [], last = null, hint = null, busy = false;

  function initialBoard() {
    var b = [];
    for (var r = 0; r < 8; r++) {
      b.push([]);
      for (var c = 0; c < 8; c++) {
        var dark = (r + c) % 2 === 1;
        b[r].push(dark && r < 3 ? 'b' : dark && r > 4 ? 'r' : null);
      }
    }
    return b;
  }

  function newGame() {
    state = { board: initialBoard(), turn: 'r', chain: null };
    selected = null; history = []; notes = []; last = null; hint = null; busy = false;
    hintEl.textContent = '';
    save();
    render();
    computerMove();
  }

  var colorOf = function (p) { return p ? p.toLowerCase() : null; };
  var isKing = function (p) { return p === 'R' || p === 'B'; };
  var inside = function (r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; };
  var clone = function (b) { return b.map(function (row) { return row.slice(); }); };

  function dirs(p) {
    if (isKing(p)) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    return colorOf(p) === 'r' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
  }

  // Moves for one piece: { from, to, capture } (capture = square jumped over or null)
  function pieceMoves(b, r, c) {
    var p = b[r][c], out = [];
    dirs(p).forEach(function (d) {
      var r1 = r + d[0], c1 = c + d[1], r2 = r + 2 * d[0], c2 = c + 2 * d[1];
      if (!inside(r1, c1)) return;
      if (!b[r1][c1]) out.push({ from: [r, c], to: [r1, c1], capture: null });
      else if (colorOf(b[r1][c1]) !== colorOf(p) && inside(r2, c2) && !b[r2][c2]) {
        out.push({ from: [r, c], to: [r2, c2], capture: [r1, c1] });
      }
    });
    return out;
  }

  // All legal moves for the side to move (captures are mandatory, chains continue with the same piece)
  function legalMoves(s) {
    var all = [];
    if (s.chain) {
      return pieceMoves(s.board, s.chain[0], s.chain[1]).filter(function (m) { return m.capture; });
    }
    for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) {
      if (colorOf(s.board[r][c]) === s.turn) all = all.concat(pieceMoves(s.board, r, c));
    }
    var caps = all.filter(function (m) { return m.capture; });
    return caps.length ? caps : all;
  }

  function applyMove(s, m) {
    var b = clone(s.board), p = b[m.from[0]][m.from[1]];
    b[m.from[0]][m.from[1]] = null;
    if (m.capture) b[m.capture[0]][m.capture[1]] = null;
    var crowned = !isKing(p) && ((p === 'r' && m.to[0] === 0) || (p === 'b' && m.to[0] === 7));
    b[m.to[0]][m.to[1]] = crowned ? p.toUpperCase() : p;
    var next = { board: b, turn: s.turn, chain: null };
    if (m.capture && !crowned) {
      var more = pieceMoves(b, m.to[0], m.to[1]).some(function (x) { return x.capture; });
      if (more) { next.chain = m.to; return next; }
    }
    next.turn = s.turn === 'r' ? 'b' : 'r';
    return next;
  }

  // ----- Search: minimax with alpha-beta (scores are from Black's point of view) -----
  function evaluate(b) {
    var score = 0;
    for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) {
      var p = b[r][c];
      if (!p) continue;
      var v = isKing(p) ? 175 : 100 + (colorOf(p) === 'b' ? r : 7 - r) * 4;
      if (c >= 2 && c <= 5 && r >= 2 && r <= 5) v += 6;
      score += colorOf(p) === 'b' ? v : -v;
    }
    return score;
  }

  var deadline = Infinity, nodes = 0, TIMEOUT = { timeout: true };
  function minimax(s, depth, alpha, beta) {
    if ((++nodes & 511) === 0 && Date.now() > deadline) throw TIMEOUT;
    var moves = legalMoves(s);
    if (!moves.length) return s.turn === 'b' ? -WIN - depth : WIN + depth;
    if (depth <= 0 && !s.chain) return evaluate(s.board);
    var maximizing = s.turn === 'b', best = maximizing ? -Infinity : Infinity;
    for (var i = 0; i < moves.length; i++) {
      var child = applyMove(s, moves[i]);
      var v = minimax(child, child.turn === s.turn ? depth : depth - 1, alpha, beta);
      if (maximizing) { best = Math.max(best, v); alpha = Math.max(alpha, v); }
      else { best = Math.min(best, v); beta = Math.min(beta, v); }
      if (beta <= alpha) break;
    }
    return best;
  }

  // Score every legal move for the side to move, from that side's point of view.
  // Iterative deepening up to `plies`; deeper iterations stop at the time budget (depth 1 always completes).
  function scoreMoves(s, plies, timeMs) {
    var sign = s.turn === 'b' ? 1 : -1, moves = legalMoves(s), result = null, stopAt = Date.now() + (timeMs || 1000);
    for (var p = 1; p <= plies; p++) {
      deadline = p === 1 ? Infinity : stopAt;
      try {
        result = moves.map(function (m) {
          var child = applyMove(s, m);
          var d = child.turn === s.turn ? p : p - 1;
          return { m: m, v: sign * minimax(child, d, -Infinity, Infinity) };
        });
      } catch (e) {
        if (e !== TIMEOUT) throw e;
        break;
      }
    }
    deadline = Infinity;
    return result;
  }
  function bestOf(scored) {
    return scored.reduce(function (a, b) { return b.v > a.v ? b : a; }, scored[0]);
  }
  var sameMove = function (a, b) {
    return a.from[0] === b.from[0] && a.from[1] === b.from[1] && a.to[0] === b.to[0] && a.to[1] === b.to[1];
  };

  // ----- Commentary -----
  function sq(rc) { return 'abcdefgh'[rc[1]] + (8 - rc[0]); }
  function label(m) { return sq(m.from) + (m.capture ? 'x' : '-') + sq(m.to); }
  function fmtEval(vBlack) {
    var v = -vBlack; // shown from Red's point of view
    if (v > WIN / 2) return 'Red wins';
    if (v < -WIN / 2) return 'Black wins';
    return (v >= 0 ? '+' : '') + (v / 100).toFixed(1);
  }
  function describe(s, m) {
    var p = s.board[m.from[0]][m.from[1]], next = applyMove(s, m), parts = [];
    if (m.capture) parts.push(isKing(s.board[m.capture[0]][m.capture[1]]) ? 'captures a king' : 'captures a man');
    if (!isKing(p) && isKing(next.board[m.to[0]][m.to[1]])) parts.push('crowns a king');
    if (next.chain) parts.push('must keep jumping');
    if (!legalMoves(next).length) parts.push('leaves the opponent with no moves');
    if (!parts.length) parts.push(isKing(p) ? 'repositions a king' : 'quiet developing move');
    var t = parts.join(', ');
    return t.charAt(0).toUpperCase() + t.slice(1) + '.';
  }
  function grade(loss) {
    if (loss <= 15) return 'Excellent';
    if (loss <= 40) return 'Good';
    if (loss <= 90) return 'Inaccuracy';
    if (loss <= 200) return 'Mistake';
    return 'Blunder';
  }
  function analyse(s, m) {
    var sign = s.turn === 'b' ? 1 : -1;
    var scored = scoreMoves(s, 4, 300), best = bestOf(scored);
    var mine = scored.filter(function (x) { return sameMove(x.m, m); })[0] || best;
    var text = describe(s, m), q, loss = best.v - mine.v;
    if (scored.length === 1) q = 'Forced';
    else if (loss <= 0) q = 'Best';
    else if (best.v > WIN / 2 && mine.v < WIN / 2) { q = 'Blunder'; text += ' Missed a forced win.'; }
    else if (mine.v < -WIN / 2 && best.v > -WIN / 2) { q = 'Blunder'; text += ' Walks into a lost position.'; }
    else q = grade(loss);
    if (q !== 'Best' && q !== 'Forced' && q !== 'Excellent') text += ' Better was ' + label(best.m) + ': ' + describe(s, best.m).toLowerCase();
    return { color: s.turn, mv: label(m), q: q, ev: fmtEval(sign * mine.v), txt: text };
  }

  // ----- Playing moves -----
  function play(m) {
    notes.push(analyse(state, m));
    history.push(JSON.stringify({ state: state, last: last }));
    state = applyMove(state, m);
    last = m;
    hint = null;
    hintEl.textContent = '';
  }

  var computerToMove = function () { return modeEl.value === 'ai' && state.turn === 'b' && legalMoves(state).length > 0; };

  function computerChoice() {
    var L = LEVELS[+levelEl.value] || LEVELS[5];
    var scored = scoreMoves(state, L.depth, 300 + 150 * (+levelEl.value || 5)), best = scored[0], bestV = -Infinity;
    scored.forEach(function (x) {
      var v = x.v + (Math.abs(x.v) > WIN / 2 ? 0 : (Math.random() * 2 - 1) * L.noise);
      if (v > bestV) { bestV = v; best = x; }
    });
    return best.m;
  }

  function computerMove() {
    if (busy || !computerToMove()) return;
    busy = true;
    render();
    setTimeout(function () {
      try { play(computerChoice()); } catch (e) { console.error('Computer move failed', e); }
      busy = false;
      save();
      render();
      computerMove(); // continue a multi-jump
    }, 350);
  }

  // ----- UI -----
  function onSquare(r, c) {
    if (busy || computerToMove()) return;
    var moves = legalMoves(state);
    if (selected) {
      var m = moves.find(function (x) {
        return x.from[0] === selected[0] && x.from[1] === selected[1] && x.to[0] === r && x.to[1] === c;
      });
      if (m) {
        play(m);
        selected = state.chain ? state.chain : null;
        save();
        render();
        computerMove();
        return;
      }
    }
    if (state.chain) return;
    selected = moves.some(function (x) { return x.from[0] === r && x.from[1] === c; }) ? [r, c] : null;
    render();
  }

  function undo() {
    if (busy || !history.length) return;
    do {
      var prev = JSON.parse(history.pop());
      state = prev.state;
      last = prev.last;
      notes.pop();
    } while (modeEl.value === 'ai' && history.length && state.turn === 'b');
    selected = state.chain || null;
    hint = null;
    hintEl.textContent = '';
    save();
    render();
  }

  function suggest() {
    var moves = legalMoves(state);
    if (busy || !moves.length || computerToMove()) return;
    busy = true;
    statusEl.textContent = 'Looking for the best move…';
    render(true);
    setTimeout(function () {
      try {
        var best = bestOf(scoreMoves(state, 8, 1500));
        hint = best.m;
        hintEl.textContent = 'Suggestion: ' + label(best.m) + ' — ' + describe(state, best.m).toLowerCase() +
          ' (eval ' + fmtEval(best.v * (state.turn === 'b' ? 1 : -1)) + ')';
      } catch (e) { console.error('Suggest failed', e); }
      busy = false;
      render();
    }, 30);
  }

  var at = function (rc, r, c) { return rc && rc[0] === r && rc[1] === c; };

  function render(keepStatus) {
    var moves = legalMoves(state);
    var targets = selected ? moves.filter(function (m) { return m.from[0] === selected[0] && m.from[1] === selected[1]; }) : [];
    var canAct = !busy && !computerToMove();
    boardEl.innerHTML = '';
    for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) {
      var sqEl = document.createElement('div');
      sqEl.className = 'sq ' + ((r + c) % 2 ? 'dark' : 'light');
      if (at(selected, r, c)) sqEl.className += ' selected';
      if (targets.some(function (m) { return m.to[0] === r && m.to[1] === c; })) sqEl.className += ' target';
      if (canAct && moves.some(function (m) { return m.from[0] === r && m.from[1] === c; })) sqEl.className += ' movable';
      if (hint && (at(hint.from, r, c) || at(hint.to, r, c))) sqEl.className += ' hint';
      else if (last && (at(last.from, r, c) || at(last.to, r, c))) sqEl.className += ' last';
      var p = state.board[r][c];
      if (p) {
        var el = document.createElement('div');
        el.className = 'piece ' + colorOf(p);
        el.textContent = isKing(p) ? '♛' : '';
        sqEl.appendChild(el);
      }
      sqEl.addEventListener('click', onSquare.bind(null, r, c));
      boardEl.appendChild(sqEl);
    }

    levelWrap.style.display = modeEl.value === 'ai' ? '' : 'none';
    undoBtn.disabled = busy || !history.length;
    suggestBtn.disabled = busy || !moves.length || computerToMove();

    if (!keepStatus) {
      var name = state.turn === 'r' ? 'Red' : 'Black';
      if (!moves.length) statusEl.textContent = (state.turn === 'r' ? 'Black' : 'Red') + ' wins!';
      else if (computerToMove()) statusEl.textContent = 'Computer (Black) is thinking…';
      else if (state.chain) statusEl.textContent = name + ': keep jumping!';
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
      mv.className = 'mv'; mv.textContent = (k + 1) + '. ' + (n.color === 'r' ? 'Red' : 'Black') + ' ' + n.mv;
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
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        state: state, mode: modeEl.value, level: levelEl.value, history: history, notes: notes, last: last
      }));
    } catch (e) { /* storage unavailable */ }
  }

  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (saved && saved.state && saved.state.board) {
        state = saved.state;
        modeEl.value = saved.mode === 'human' ? 'human' : 'ai';
        if (saved.level >= 1 && saved.level <= 10) levelEl.value = String(saved.level);
        history = Array.isArray(saved.history) ? saved.history : [];
        notes = Array.isArray(saved.notes) && saved.notes.length === history.length ? saved.notes : history.map(function () {
          return { color: '', mv: '—', q: 'Good', ev: '', txt: 'Played before commentary was available.' };
        });
        last = saved.last || null;
        return true;
      }
    } catch (e) { console.error('Could not restore checkers game', e); }
    return false;
  }

  for (var lv = 1; lv <= 10; lv++) {
    var opt = document.createElement('option');
    opt.value = String(lv);
    opt.textContent = lv + ' — ' + LEVELS[lv].name;
    levelEl.appendChild(opt);
  }
  levelEl.value = '5';
  document.getElementById('restart').addEventListener('click', newGame);
  undoBtn.addEventListener('click', undo);
  suggestBtn.addEventListener('click', suggest);
  modeEl.addEventListener('change', function () { hint = null; hintEl.textContent = ''; save(); render(); computerMove(); });
  levelEl.addEventListener('change', save);

  if (load()) { render(); computerMove(); } else newGame();
})();
