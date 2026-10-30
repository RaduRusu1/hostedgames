/**
 * Fast 0x88 board representation with legal move generation, make/unmake and
 * Zobrist hashing. Square index = row * 16 + col, row 0 = rank 8, col 0 = file a.
 */

export const EMPTY = 0;
export const PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;
export const WHITE = 0, BLACK = 8;

export const F_CAPTURE = 1, F_EP = 2, F_CASTLE = 4, F_DOUBLE = 8;

const KNIGHT_D = [-33, -31, -18, -14, 14, 18, 31, 33];
const BISHOP_D = [-17, -15, 15, 17];
const ROOK_D = [-16, -1, 1, 16];
const KING_D = [-17, -16, -15, -1, 1, 15, 16, 17];

const CASTLE_MASK = new Int8Array(128).fill(15);
CASTLE_MASK[112] = 15 & ~2; // a1
CASTLE_MASK[116] = 15 & ~3; // e1
CASTLE_MASK[119] = 15 & ~1; // h1
CASTLE_MASK[0] = 15 & ~8; // a8
CASTLE_MASK[4] = 15 & ~12; // e8
CASTLE_MASK[7] = 15 & ~4; // h8

// Zobrist keys (two independent 32-bit halves)
function rnd() { return (Math.random() * 0x100000000) >>> 0; }
const Z1 = Array.from({ length: 16 }, () => Array.from({ length: 128 }, rnd));
const Z2 = Array.from({ length: 16 }, () => Array.from({ length: 128 }, rnd));
const ZC1 = Array.from({ length: 16 }, rnd), ZC2 = Array.from({ length: 16 }, rnd);
const ZE1 = Array.from({ length: 128 }, rnd), ZE2 = Array.from({ length: 128 }, rnd);
const ZS1 = rnd(), ZS2 = rnd();

export const encode = (from: number, to: number, promo = 0, flags = 0) => from | (to << 7) | (promo << 14) | (flags << 18);
export const mFrom = (m: number) => m & 127;
export const mTo = (m: number) => (m >> 7) & 127;
export const mPromo = (m: number) => (m >> 14) & 15;
export const mFlags = (m: number) => (m >> 18) & 15;

export function sqName(sq: number) { return 'abcdefgh'[sq & 7] + (8 - (sq >> 4)); }
export function sqIndex(name: string) { return (8 - Number(name[1])) * 16 + (name.charCodeAt(0) - 97); }

const PIECE_CHARS = ' pnbrqk';

type Undo = { move: number; captured: number; castling: number; ep: number; half: number; h1: number; h2: number };

export class Board {
  sq = new Int8Array(128);
  side = WHITE;
  castling = 0;
  ep = -1;
  half = 0;
  kings = [0, 0];
  h1 = 0;
  h2 = 0;
  hist: Undo[] = [];
  keyHist: number[] = []; // h1 values of previous positions (for repetition)
  keyHist2: number[] = [];

  constructor(fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') { this.load(fen); }

  load(fen: string) {
    this.sq.fill(0);
    const [placement, side, castle, ep, half] = fen.split(' ');
    let row = 0, col = 0;
    for (const ch of placement) {
      if (ch === '/') { row++; col = 0; continue; }
      if (ch >= '1' && ch <= '8') { col += Number(ch); continue; }
      const lower = ch.toLowerCase();
      const color = ch === lower ? BLACK : WHITE;
      const p = PIECE_CHARS.indexOf(lower) | color;
      const s = row * 16 + col;
      this.sq[s] = p;
      if ((p & 7) === KING) this.kings[color >> 3] = s;
      col++;
    }
    this.side = side === 'b' ? BLACK : WHITE;
    this.castling = (castle.includes('K') ? 1 : 0) | (castle.includes('Q') ? 2 : 0) | (castle.includes('k') ? 4 : 0) | (castle.includes('q') ? 8 : 0);
    this.ep = ep && ep !== '-' ? sqIndex(ep) : -1;
    this.half = Number(half ?? 0) || 0;
    this.hist = [];
    this.keyHist = [];
    this.keyHist2 = [];
    this.rehash();
  }

  rehash() {
    let a = 0, b = 0;
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      const p = this.sq[s];
      if (p) { a ^= Z1[p][s]; b ^= Z2[p][s]; }
    }
    a ^= ZC1[this.castling]; b ^= ZC2[this.castling];
    if (this.ep >= 0) { a ^= ZE1[this.ep]; b ^= ZE2[this.ep]; }
    if (this.side === BLACK) { a ^= ZS1; b ^= ZS2; }
    this.h1 = a >>> 0; this.h2 = b >>> 0;
  }

  attacked(s: number, by: number): boolean {
    const b = this.sq;
    // pawns
    if (by === WHITE) {
      if (!((s + 15) & 0x88) && b[s + 15] === (PAWN | WHITE)) return true;
      if (!((s + 17) & 0x88) && b[s + 17] === (PAWN | WHITE)) return true;
    } else {
      if (!((s - 15) & 0x88) && b[s - 15] === (PAWN | BLACK)) return true;
      if (!((s - 17) & 0x88) && b[s - 17] === (PAWN | BLACK)) return true;
    }
    for (const d of KNIGHT_D) { const t = s + d; if (!(t & 0x88) && b[t] === (KNIGHT | by)) return true; }
    for (const d of KING_D) { const t = s + d; if (!(t & 0x88) && b[t] === (KING | by)) return true; }
    for (const d of BISHOP_D) {
      let t = s + d;
      while (!(t & 0x88)) {
        const p = b[t];
        if (p) { if (p === (BISHOP | by) || p === (QUEEN | by)) return true; break; }
        t += d;
      }
    }
    for (const d of ROOK_D) {
      let t = s + d;
      while (!(t & 0x88)) {
        const p = b[t];
        if (p) { if (p === (ROOK | by) || p === (QUEEN | by)) return true; break; }
        t += d;
      }
    }
    return false;
  }

  inCheck(): boolean { return this.attacked(this.kings[this.side >> 3], this.side ^ BLACK); }

  /** Pseudo-legal moves (may leave own king in check). */
  pseudo(capturesOnly = false): number[] {
    const out: number[] = [];
    const b = this.sq, us = this.side, them = us ^ BLACK;
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      const p = b[s];
      if (!p || (p & 8) !== us) continue;
      const t = p & 7;
      if (t === PAWN) {
        const dir = us === WHITE ? -16 : 16;
        const startRow = us === WHITE ? 6 : 1;
        const promoRow = us === WHITE ? 0 : 7;
        const one = s + dir;
        if (!(one & 0x88) && !b[one]) {
          if ((one >> 4) === promoRow) {
            for (const pr of [QUEEN, ROOK, BISHOP, KNIGHT]) out.push(encode(s, one, pr | us, 0));
          } else if (!capturesOnly) {
            out.push(encode(s, one));
            const two = one + dir;
            if ((s >> 4) === startRow && !b[two]) out.push(encode(s, two, 0, F_DOUBLE));
          }
        }
        for (const cd of [dir - 1, dir + 1]) {
          const c = s + cd;
          if (c & 0x88) continue;
          if (b[c] && (b[c] & 8) === them) {
            if ((c >> 4) === promoRow) for (const pr of [QUEEN, ROOK, BISHOP, KNIGHT]) out.push(encode(s, c, pr | us, F_CAPTURE));
            else out.push(encode(s, c, 0, F_CAPTURE));
          } else if (c === this.ep) {
            out.push(encode(s, c, 0, F_CAPTURE | F_EP));
          }
        }
        continue;
      }
      const slide = t === BISHOP || t === ROOK || t === QUEEN;
      const dirs = t === KNIGHT ? KNIGHT_D : t === BISHOP ? BISHOP_D : t === ROOK ? ROOK_D : KING_D;
      for (const d of dirs) {
        let to = s + d;
        while (!(to & 0x88)) {
          const q = b[to];
          if (q) {
            if ((q & 8) === them) out.push(encode(s, to, 0, F_CAPTURE));
            break;
          }
          if (!capturesOnly) out.push(encode(s, to));
          if (!slide) break;
          to += d;
        }
      }
      if (t === KING && !capturesOnly) {
        if (us === WHITE && s === 116) {
          if (this.castling & 1 && !b[117] && !b[118] && b[119] === (ROOK | WHITE) && !this.attacked(116, them) && !this.attacked(117, them) && !this.attacked(118, them)) out.push(encode(116, 118, 0, F_CASTLE));
          if (this.castling & 2 && !b[115] && !b[114] && !b[113] && b[112] === (ROOK | WHITE) && !this.attacked(116, them) && !this.attacked(115, them) && !this.attacked(114, them)) out.push(encode(116, 114, 0, F_CASTLE));
        } else if (us === BLACK && s === 4) {
          if (this.castling & 4 && !b[5] && !b[6] && b[7] === (ROOK | BLACK) && !this.attacked(4, them) && !this.attacked(5, them) && !this.attacked(6, them)) out.push(encode(4, 6, 0, F_CASTLE));
          if (this.castling & 8 && !b[3] && !b[2] && !b[1] && b[0] === (ROOK | BLACK) && !this.attacked(4, them) && !this.attacked(3, them) && !this.attacked(2, them)) out.push(encode(4, 2, 0, F_CASTLE));
        }
      }
    }
    return out;
  }

  private toggle(p: number, s: number) { this.h1 ^= Z1[p][s]; this.h2 ^= Z2[p][s]; }

  /** Make a move; returns false (and restores) if it leaves the mover in check. */
  make(m: number): boolean {
    const from = mFrom(m), to = mTo(m), promo = mPromo(m), flags = mFlags(m);
    const b = this.sq, us = this.side;
    const piece = b[from];
    let capSq = to;
    if (flags & F_EP) capSq = us === WHITE ? to + 16 : to - 16;
    const captured = b[capSq];
    this.hist.push({ move: m, captured, castling: this.castling, ep: this.ep, half: this.half, h1: this.h1, h2: this.h2 });
    this.keyHist.push(this.h1);
    this.keyHist2.push(this.h2);

    if (captured) { this.toggle(captured, capSq); b[capSq] = 0; }
    this.toggle(piece, from);
    b[from] = 0;
    const placed = promo || piece;
    b[to] = placed;
    this.toggle(placed, to);

    if (flags & F_CASTLE) {
      let rf = -1, rt = -1;
      if (to === 118) { rf = 119; rt = 117; } else if (to === 114) { rf = 112; rt = 115; }
      else if (to === 6) { rf = 7; rt = 5; } else if (to === 2) { rf = 0; rt = 3; }
      const rook = b[rf];
      b[rf] = 0; this.toggle(rook, rf);
      b[rt] = rook; this.toggle(rook, rt);
    }
    if ((piece & 7) === KING) this.kings[us >> 3] = to;

    if (this.ep >= 0) { this.h1 ^= ZE1[this.ep]; this.h2 ^= ZE2[this.ep]; }
    this.ep = flags & F_DOUBLE ? (from + to) >> 1 : -1;
    if (this.ep >= 0) { this.h1 ^= ZE1[this.ep]; this.h2 ^= ZE2[this.ep]; }

    this.h1 ^= ZC1[this.castling]; this.h2 ^= ZC2[this.castling];
    this.castling &= CASTLE_MASK[from] & CASTLE_MASK[to];
    this.h1 ^= ZC1[this.castling]; this.h2 ^= ZC2[this.castling];

    this.half = captured || (piece & 7) === PAWN ? 0 : this.half + 1;
    this.side ^= BLACK;
    this.h1 ^= ZS1; this.h2 ^= ZS2;
    this.h1 >>>= 0; this.h2 >>>= 0;

    if (this.attacked(this.kings[us >> 3], this.side)) { this.unmake(); return false; }
    return true;
  }

  unmake() {
    const u = this.hist.pop();
    if (!u) return;
    this.keyHist.pop();
    this.keyHist2.pop();
    const m = u.move;
    const from = mFrom(m), to = mTo(m), promo = mPromo(m), flags = mFlags(m);
    const b = this.sq;
    this.side ^= BLACK;
    const us = this.side;
    const moved = promo ? (PAWN | us) : b[to];
    b[from] = moved;
    b[to] = 0;
    if (u.captured) {
      const capSq = flags & F_EP ? (us === WHITE ? to + 16 : to - 16) : to;
      b[capSq] = u.captured;
    }
    if (flags & F_CASTLE) {
      if (to === 118) { b[119] = b[117]; b[117] = 0; } else if (to === 114) { b[112] = b[115]; b[115] = 0; }
      else if (to === 6) { b[7] = b[5]; b[5] = 0; } else if (to === 2) { b[0] = b[3]; b[3] = 0; }
    }
    if ((moved & 7) === KING) this.kings[us >> 3] = from;
    this.castling = u.castling;
    this.ep = u.ep;
    this.half = u.half;
    this.h1 = u.h1;
    this.h2 = u.h2;
  }

  makeNull() {
    this.hist.push({ move: 0, captured: 0, castling: this.castling, ep: this.ep, half: this.half, h1: this.h1, h2: this.h2 });
    this.keyHist.push(this.h1);
    this.keyHist2.push(this.h2);
    if (this.ep >= 0) { this.h1 ^= ZE1[this.ep]; this.h2 ^= ZE2[this.ep]; }
    this.ep = -1;
    this.side ^= BLACK;
    this.h1 = (this.h1 ^ ZS1) >>> 0; this.h2 = (this.h2 ^ ZS2) >>> 0;
    this.half++;
  }

  unmakeNull() {
    const u = this.hist.pop();
    if (!u) return;
    this.keyHist.pop();
    this.keyHist2.pop();
    this.side ^= BLACK;
    this.ep = u.ep; this.half = u.half; this.h1 = u.h1; this.h2 = u.h2;
  }

  legal(): number[] {
    const res: number[] = [];
    for (const m of this.pseudo()) if (this.make(m)) { this.unmake(); res.push(m); }
    return res;
  }

  /** Position occurred before (twofold within search is treated as a draw). */
  isRepetition(): boolean {
    const n = this.keyHist.length;
    for (let i = n - 2; i >= 0 && i >= n - this.half; i -= 2) {
      if (this.keyHist[i] === this.h1 && this.keyHist2[i] === this.h2) return true;
    }
    return false;
  }
}
