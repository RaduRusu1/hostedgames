// Checkers (English draughts) - a self-contained sample game for the HostedGames upload feature.
// Pieces: 'r' / 'b' men, 'R' / 'B' kings. Red starts at the bottom and moves first.
(function () {
  'use strict';

  var boardEl = document.getElementById('board');
  var statusEl = document.getElementById('status');
  var modeEl = document.getElementById('mode');
  var SAVE_KEY = 'hostedgames-checkers';

  var state, selected = null, history = [];

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
    selected = null;
    history = [];
    save();
    render();
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

  // ----- Simple computer opponent: 4-ply minimax with alpha-beta -----
  function evaluate(b) {
    var score = 0;
    for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) {
      var p = b[r][c];
      if (!p) continue;
      var v = isKing(p) ? 175 : 100 + (colorOf(p) === 'b' ? r : 7 - r) * 4;
      if (c >= 2 && c <= 5 && r >= 2 && r <= 5) v += 6;
      score += colorOf(p) === 'b' ? v : -v;
    }
    return score; // positive = good for black (the computer)
  }

  function minimax(s, depth, alpha, beta) {
    var moves = legalMoves(s);
    if (!moves.length) return s.turn === 'b' ? -10000 - depth : 10000 + depth;
    if (depth <= 0 && !s.chain) return evaluate(s.board);
    var maximizing = s.turn === 'b', best = maximizing ? -Infinity : Infinity;
    for (var i = 0; i < moves.length; i++) {
      var v = minimax(applyMove(s, moves[i]), s.chain ? depth : depth - 1, alpha, beta);
      if (maximizing) { best = Math.max(best, v); alpha = Math.max(alpha, v); }
      else { best = Math.min(best, v); beta = Math.min(beta, v); }
      if (beta <= alpha) break;
    }
    return best;
  }

  function computerMove() {
    if (modeEl.value !== 'ai' || state.turn !== 'b') return;
    var moves = legalMoves(state);
    if (!moves.length) return;
    var best = null, bestV = -Infinity;
    moves.forEach(function (m) {
      var v = minimax(applyMove(state, m), 4, -Infinity, Infinity) + Math.random();
      if (v > bestV) { bestV = v; best = m; }
    });
    setTimeout(function () {
      state = applyMove(state, best);
      save();
      render();
      if (state.turn === 'b') computerMove();
    }, 350);
  }

  // ----- UI -----
  function onSquare(r, c) {
    if (modeEl.value === 'ai' && state.turn === 'b') return;
    var moves = legalMoves(state);
    if (selected) {
      var m = moves.find(function (x) {
        return x.from[0] === selected[0] && x.from[1] === selected[1] && x.to[0] === r && x.to[1] === c;
      });
      if (m) {
        history.push(JSON.stringify(state));
        state = applyMove(state, m);
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

  function render() {
    var moves = legalMoves(state);
    var targets = selected ? moves.filter(function (m) { return m.from[0] === selected[0] && m.from[1] === selected[1]; }) : [];
    boardEl.innerHTML = '';
    for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) {
      var sq = document.createElement('div');
      sq.className = 'sq ' + ((r + c) % 2 ? 'dark' : 'light');
      if (selected && selected[0] === r && selected[1] === c) sq.className += ' selected';
      if (targets.some(function (m) { return m.to[0] === r && m.to[1] === c; })) sq.className += ' target';
      if (moves.some(function (m) { return m.from[0] === r && m.from[1] === c; })) sq.className += ' movable';
      var p = state.board[r][c];
      if (p) {
        var el = document.createElement('div');
        el.className = 'piece ' + colorOf(p);
        el.textContent = isKing(p) ? '♛' : '';
        sq.appendChild(el);
      }
      sq.addEventListener('click', onSquare.bind(null, r, c));
      boardEl.appendChild(sq);
    }
    var name = state.turn === 'r' ? 'Red' : 'Black';
    if (!moves.length) statusEl.textContent = (state.turn === 'r' ? 'Black' : 'Red') + ' wins!';
    else if (state.chain) statusEl.textContent = name + ': keep jumping!';
    else statusEl.textContent = name + ' to move' + (modeEl.value === 'ai' && state.turn === 'b' ? ' (thinking…)' : '');
  }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ state: state, mode: modeEl.value })); } catch (e) { /* storage unavailable */ }
  }

  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (saved && saved.state && saved.state.board) {
        state = saved.state;
        modeEl.value = saved.mode === 'human' ? 'human' : 'ai';
        return true;
      }
    } catch (e) { console.error('Could not restore checkers game', e); }
    return false;
  }

  document.getElementById('restart').addEventListener('click', newGame);
  document.getElementById('undo').addEventListener('click', function () {
    if (!history.length) return;
    state = JSON.parse(history.pop());
    selected = state.chain || null;
    save();
    render();
  });
  modeEl.addEventListener('change', function () { save(); render(); computerMove(); });

  if (load()) { render(); computerMove(); } else newGame();
})();
