import { Chess } from 'chess.js';
import { Board, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING, WHITE, F_CAPTURE, mFrom, mTo, mPromo, mFlags, sqName } from './board';

// ----- Constants -----
export const MATE = 100000;
const INF = 1_000_000;
const VAL = [0, 100, 320, 330, 500, 900, 0];

// Piece-square tables from White's point of view, index 0 = a8 … 63 = h1.
const PST = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  kMid: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ],
  kEnd: [
    -50, -40, -30, -20, -20, -30, -40, -50,
    -30, -20, -10, 0, 0, -10, -20, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -30, 0, 0, 0, 0, -30, -30,
    -50, -30, -30, -30, -30, -30, -30, -50,
  ],
};

// ----- Difficulty levels -----
export type LevelConfig = { depth: number; quiesce: boolean; noise: number; timeMs: number; randomChance: number };

export const LEVELS: Record<number, LevelConfig> = {
  1: { depth: 1, quiesce: false, noise: 350, timeMs: 600, randomChance: 0.35 },
  2: { depth: 1, quiesce: true, noise: 220, timeMs: 600, randomChance: 0.2 },
  3: { depth: 2, quiesce: true, noise: 140, timeMs: 800, randomChance: 0.1 },
  4: { depth: 2, quiesce: true, noise: 80, timeMs: 1000, randomChance: 0.04 },
  5: { depth: 3, quiesce: true, noise: 45, timeMs: 1200, randomChance: 0 },
  6: { depth: 4, quiesce: true, noise: 20, timeMs: 1500, randomChance: 0 },
  7: { depth: 5, quiesce: true, noise: 0, timeMs: 1500, randomChance: 0 },
  8: { depth: 6, quiesce: true, noise: 0, timeMs: 2500, randomChance: 0 },
  9: { depth: 8, quiesce: true, noise: 0, timeMs: 4000, randomChance: 0 },
  10: { depth: 12, quiesce: true, noise: 0, timeMs: 6000, randomChance: 0 },
};

export const LEVEL_LABELS: Record<number, string> = {
  1: 'Beginner', 2: 'Novice', 3: 'Casual', 4: 'Club', 5: 'Intermediate',
  6: 'Advanced', 7: 'Expert', 8: 'Master', 9: 'Grandmaster', 10: 'Champion',
};

const PST_BY_TYPE: number[][] = [[], PST.p, PST.n, PST.b, PST.r, PST.q];

// ----- Evaluation -----
/** Static evaluation in centipawns from White's point of view. */
export function evaluate(b: Board): number {
  const sq = b.sq;
  let score = 0, phase = 0, wB = 0, bB = 0, wk = -1, bk = -1;
  for (let s = 0; s < 128; s++) {
    if (s & 0x88) { s += 7; continue; }
    const p = sq[s];
    if (!p) continue;
    const t = p & 7;
    const white = (p & 8) === WHITE;
    const idx = white ? (s >> 4) * 8 + (s & 7) : (7 - (s >> 4)) * 8 + (s & 7);
    if (t === KING) { if (white) wk = idx; else bk = idx; continue; }
    if (t === KNIGHT || t === BISHOP) phase += 1;
    else if (t === ROOK) phase += 2;
    else if (t === QUEEN) phase += 4;
    if (t === BISHOP) { if (white) wB++; else bB++; }
    const v = VAL[t] + PST_BY_TYPE[t][idx];
    score += white ? v : -v;
  }
  const ph = Math.min(phase, 24);
  const king = (i: number) => (i < 0 ? 0 : ((PST.kMid[i] * ph + PST.kEnd[i] * (24 - ph)) / 24) | 0);
  score += king(wk) - king(bk);
  if (wB >= 2) score += 30;
  if (bB >= 2) score -= 30;
  return score;
}

// ----- Search -----
class SearchAbort extends Error {}

const TT_SIZE = 1 << 18;
const TT_MASK = TT_SIZE - 1;

class Searcher {
  nodes = 0;
  deadline = 0;
  useQuiesce = true;
  killers: number[][] = Array.from({ length: 128 }, () => [0, 0]);
  history = new Int32Array(128 * 128);
  ttKey = new Uint32Array(TT_SIZE);
  ttMove = new Int32Array(TT_SIZE);

  constructor(public b: Board) {}

  private tick() {
    if ((++this.nodes & 2047) === 0 && Date.now() > this.deadline) throw new SearchAbort();
  }

  private order(moves: number[], ply: number, hashMove: number): number[] {
    const b = this.b.sq;
    const k = this.killers[ply] ?? [0, 0];
    const scores = moves.map((m) => {
      if (m === hashMove) return 1e8;
      const fl = mFlags(m);
      let s = 0;
      if (fl & F_CAPTURE) {
        const victim = b[mTo(m)] & 7 || PAWN;
        s = 1e7 + VAL[victim] * 10 - VAL[b[mFrom(m)] & 7];
      } else if (m === k[0]) s = 9e6;
      else if (m === k[1]) s = 8e6;
      else s = this.history[mFrom(m) * 128 + mTo(m)];
      const pr = mPromo(m);
      if (pr) s += 5e6 + VAL[pr & 7];
      return s;
    });
    const idx = moves.map((_, i) => i).sort((a, c) => scores[c] - scores[a]);
    return idx.map((i) => moves[i]);
  }

  private hasPieces(side: number) {
    const sq = this.b.sq;
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      const p = sq[s];
      if (p && (p & 8) === side && (p & 7) !== PAWN && (p & 7) !== KING) return true;
    }
    return false;
  }

  private sign() { return this.b.side === WHITE ? 1 : -1; }

  quiesce(alpha: number, beta: number, ply: number): number {
    this.tick();
    const stand = this.sign() * evaluate(this.b);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (ply > 60) return stand;
    for (const m of this.order(this.b.pseudo(true), ply, 0)) {
      if (!this.b.make(m)) continue;
      const score = -this.quiesce(-beta, -alpha, ply + 1);
      this.b.unmake();
      if (score >= beta) return score;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  negamax(depth: number, alpha: number, beta: number, ply: number, allowNull: boolean): number {
    this.tick();
    const b = this.b;
    if (ply > 0 && (b.half >= 100 || b.isRepetition())) return 0;
    const inCheck = b.inCheck();
    if (inCheck && ply < 40) depth++;
    if (depth <= 0) return this.useQuiesce ? this.quiesce(alpha, beta, ply) : this.sign() * evaluate(b);

    if (allowNull && !inCheck && depth >= 3 && ply > 0 && beta < MATE - 1000 && this.hasPieces(b.side)) {
      if (this.sign() * evaluate(b) >= beta) {
        b.makeNull();
        const score = -this.negamax(depth - 3, -beta, -beta + 1, ply + 1, false);
        b.unmakeNull();
        if (score >= beta) return beta;
      }
    }

    const slot = b.h1 & TT_MASK;
    const hashMove = this.ttKey[slot] === b.h2 ? this.ttMove[slot] : 0;
    let best = -INF, bestMove = 0, legal = 0;
    for (const m of this.order(b.pseudo(), ply, hashMove)) {
      if (!b.make(m)) continue;
      legal++;
      const score = -this.negamax(depth - 1, -beta, -alpha, ply + 1, true);
      b.unmake();
      if (score > best) { best = score; bestMove = m; }
      if (score > alpha) alpha = score;
      if (alpha >= beta) {
        if (!(mFlags(m) & F_CAPTURE)) {
          const k = this.killers[ply];
          if (k && k[0] !== m) { k[1] = k[0]; k[0] = m; }
          this.history[mFrom(m) * 128 + mTo(m)] += depth * depth;
        }
        break;
      }
    }
    if (legal === 0) return inCheck ? -MATE + ply : 0;
    this.ttKey[slot] = b.h2;
    this.ttMove[slot] = bestMove;
    return best;
  }
}

export type ScoredMove = { san: string; from: string; to: string; promotion?: string; score: number };
export type SearchResult = { best: ScoredMove | null; depth: number; nodes: number; scored: ScoredMove[] };

const PROMO_CHAR = ['', '', 'n', 'b', 'r', 'q'];

/** Rebuild a chess.js game from SAN history. */
export function gameFromSans(sans: string[]): Chess {
  const chess = new Chess();
  for (const s of sans) chess.move(s);
  return chess;
}

function matchMove(b: Board, from: string, to: string, promotion?: string): number {
  for (const m of b.legal()) {
    if (sqName(mFrom(m)) === from && sqName(mTo(m)) === to && (PROMO_CHAR[mPromo(m) & 7] || undefined) === (promotion || undefined)) return m;
  }
  return 0;
}

/** Board replayed from SAN history (so repetition detection knows the game's past). */
function boardFromSans(sans: string[]): { board: Board; chess: Chess } {
  const chess = gameFromSans(sans);
  const board = new Board();
  for (const mv of chess.history({ verbose: true })) {
    const m = matchMove(board, mv.from, mv.to, mv.promotion);
    if (!m || !board.make(m)) throw new Error(`Engine could not replay move ${mv.san}`);
  }
  return { board, chess };
}

/**
 * Iterative-deepening search for the side to move after `sans`.
 * Scores are from the side to move's point of view. With `fullWindow` every root move gets an exact score.
 */
export function search(sans: string[], opts: { depth: number; timeMs: number; quiesce: boolean; fullWindow?: boolean }): SearchResult {
  const { board, chess } = boardFromSans(sans);
  const verbose = chess.moves({ verbose: true });
  const toScored = (m: number, score: number): ScoredMove => {
    const from = sqName(mFrom(m)), to = sqName(mTo(m));
    const promotion = PROMO_CHAR[mPromo(m) & 7] || undefined;
    const cm = verbose.find((v) => v.from === from && v.to === to && (v.promotion || undefined) === promotion);
    return { san: cm?.san ?? `${from}${to}`, from, to, promotion, score };
  };
  let root = board.legal();
  if (root.length === 0) return { best: null, depth: 0, nodes: 0, scored: [] };

  const s = new Searcher(board);
  s.useQuiesce = opts.quiesce;
  s.deadline = Date.now() + opts.timeMs;
  let result: SearchResult = { best: toScored(root[0], 0), depth: 0, nodes: 0, scored: [] };
  for (let depth = 1; depth <= opts.depth; depth++) {
    try {
      let alpha = -INF;
      const scored: { m: number; score: number }[] = [];
      for (const m of root) {
        board.make(m);
        let score: number;
        try {
          score = opts.fullWindow
            ? -s.negamax(depth - 1, -INF, INF, 1, true)
            : -s.negamax(depth - 1, -INF, -alpha, 1, true);
        } finally {
          board.unmake();
        }
        scored.push({ m, score });
        if (score > alpha) alpha = score;
      }
      scored.sort((a, c) => c.score - a.score);
      root = scored.map((x) => x.m);
      const list = scored.map((x) => toScored(x.m, x.score));
      result = { best: list[0], depth, nodes: s.nodes, scored: list };
      if (Math.abs(scored[0].score) > MATE - 1000) break; // forced mate found
      if (root.length === 1 && depth >= 2) break; // only move
    } catch (e) {
      if (e instanceof SearchAbort) break;
      throw e;
    }
  }
  result.nodes = s.nodes;
  return result;
}

/** Pick the computer's move for a given difficulty level (1-10). */
export function findBestMove(sans: string[], level: number): SearchResult {
  const cfg = LEVELS[Math.min(10, Math.max(1, Math.round(level)))] ?? LEVELS[5];
  const noisy = cfg.noise > 0;
  const res = search(sans, { depth: cfg.depth, timeMs: cfg.timeMs, quiesce: cfg.quiesce, fullWindow: noisy });
  if (!res.best || res.scored.length === 0) return res;
  if (res.best.score > MATE - 1000) return res; // never miss a forced mate
  if (cfg.randomChance > 0 && Math.random() < cfg.randomChance) {
    const pool = res.scored.slice(0, Math.max(2, Math.ceil(res.scored.length / 2)));
    return { ...res, best: pool[Math.floor(Math.random() * pool.length)] };
  }
  if (noisy) {
    let pick = res.scored[0];
    let bestNoisy = -INF;
    for (const m of res.scored) {
      const v = m.score > MATE - 1000 ? m.score + MATE : m.score + (Math.random() * 2 - 1) * cfg.noise;
      if (v > bestNoisy) { bestNoisy = v; pick = m; }
    }
    return { ...res, best: pick };
  }
  return res;
}

/** Strong suggestion for the human player. */
export function suggestMove(sans: string[]): SearchResult {
  return search(sans, { depth: 12, timeMs: 2500, quiesce: true });
}

/** Format a White-relative score like "+1.25" or "#3". */
export function formatScore(whiteScore: number): string {
  if (Math.abs(whiteScore) > MATE - 1000) {
    const plies = MATE - Math.abs(whiteScore);
    const n = Math.max(1, Math.ceil(plies / 2));
    return `${whiteScore > 0 ? '' : '-'}#${n}`;
  }
  const v = whiteScore / 100;
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
}

