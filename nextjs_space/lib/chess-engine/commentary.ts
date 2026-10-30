import { Chess, type Move } from 'chess.js';
import { search, gameFromSans, MATE, formatScore } from './engine';
import { openingCompletedBy, isBookPosition, detectOpening } from './openings';

export type MoveQuality = 'book' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export type MoveAnnotation = {
  ply: number; // 0-based index of the move in the game
  san: string;
  color: 'w' | 'b';
  quality: MoveQuality;
  cpLoss: number;
  evalAfter: string; // White-relative, e.g. "+0.35" or "#2"
  bestSan: string | null;
  opening: string | null; // opening name when this move completes / stays in a named line
  comment: string;
};

export const QUALITY_META: Record<MoveQuality, { label: string; symbol: string; className: string }> = {
  book: { label: 'Book', symbol: '📖', className: 'text-sky-300 bg-sky-500/10 border-sky-500/30' },
  best: { label: 'Best', symbol: '★', className: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
  excellent: { label: 'Excellent', symbol: '!', className: 'text-green-300 bg-green-500/10 border-green-500/30' },
  good: { label: 'Good', symbol: '✓', className: 'text-lime-300 bg-lime-500/10 border-lime-500/30' },
  inaccuracy: { label: 'Inaccuracy', symbol: '?!', className: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30' },
  mistake: { label: 'Mistake', symbol: '?', className: 'text-orange-300 bg-orange-500/10 border-orange-500/30' },
  blunder: { label: 'Blunder', symbol: '??', className: 'text-red-300 bg-red-500/10 border-red-500/30' },
};

const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const CENTER = new Set(['d4', 'e4', 'd5', 'e5']);

function classify(cpLoss: number): MoveQuality {
  if (cpLoss <= 10) return 'best';
  if (cpLoss <= 35) return 'excellent';
  if (cpLoss <= 80) return 'good';
  if (cpLoss <= 150) return 'inaccuracy';
  if (cpLoss <= 300) return 'mistake';
  return 'blunder';
}

function describe(move: Move, ply: number, after: Chess): string[] {
  const notes: string[] = [];
  const opening = ply < 16;
  if (move.san.includes('#')) return ['Checkmate!'];
  if (move.flags.includes('k')) notes.push('Castles kingside, tucking the king away and connecting the rooks.');
  else if (move.flags.includes('q')) notes.push('Castles queenside, bringing a rook toward the center.');
  if (move.promotion) notes.push(`Promotes the pawn to a ${PIECE_NAME[move.promotion]}!`);
  if (move.flags.includes('e')) notes.push('Captures en passant.');
  else if (move.captured) notes.push(`Captures the ${PIECE_NAME[move.captured]} on ${move.to}.`);
  if (move.san.includes('+')) notes.push('Gives check.');
  const homeRank = move.color === 'w' ? '1' : '8';
  if (opening && (move.piece === 'n' || move.piece === 'b') && move.from[1] === homeRank) {
    notes.push(`Develops the ${PIECE_NAME[move.piece]}.`);
  }
  if (move.piece === 'p' && CENTER.has(move.to) && !move.captured) notes.push('Stakes a claim in the center.');
  if (opening && move.piece === 'q' && !move.captured && ply < 8) notes.push('An early queen sortie can become a target for enemy development.');
  if (move.piece === 'k' && !move.flags.includes('k') && !move.flags.includes('q') && opening && !after.isGameOver()) {
    notes.push('Moving the king this early gives up castling rights.');
  }
  if (after.isStalemate()) notes.push('Stalemate — the game is drawn.');
  else if (after.isThreefoldRepetition()) notes.push('Threefold repetition — the game is drawn.');
  return notes;
}

/**
 * Evaluate the move `sans[ply]` given the full SAN history.
 * Uses a short search so it can run for every move in the background.
 */
export function analyzeMove(sans: string[], ply: number, timeMs = 600): MoveAnnotation {
  const before = gameFromSans(sans.slice(0, ply));
  const color = before.turn();
  const played = before.move(sans[ply]);
  const after = new Chess();
  for (const s of sans.slice(0, ply + 1)) after.move(s);
  before.undo();

  const prefix = sans.slice(0, ply + 1);
  const completed = openingCompletedBy(prefix);
  const inBook = isBookPosition(prefix);
  const named = completed ?? (inBook ? detectOpening(prefix) : null);

  // Score every root move with an exact window so the played move's loss is accurate.
  const res = search(sans.slice(0, ply), { depth: 4, timeMs, quiesce: true, fullWindow: true });
  const best = res.best;
  const playedScored = res.scored.find((m) => m.san === played.san);
  const bestScore = best?.score ?? 0;
  const playedScore = playedScored?.score ?? bestScore;
  const cpLoss = Math.max(0, Math.round(bestScore - playedScore));
  const whiteAfter = color === 'w' ? playedScore : -playedScore;

  let quality: MoveQuality = inBook ? 'book' : classify(cpLoss);
  // A forced mate that was missed is always at least a mistake.
  if (!inBook && bestScore > MATE - 1000 && playedScore < MATE - 1000) quality = cpLoss > 300 ? 'blunder' : 'mistake';

  const parts: string[] = [];
  if (completed) parts.push(`This is the ${completed.name} (${completed.eco}).`);
  else if (inBook && named) parts.push(`A known move in the ${named.name}.`);
  parts.push(...describe(played, ply, after));

  if (!after.isGameOver()) {
    if (playedScore > MATE - 1000) {
      parts.push(`Forces mate in ${Math.max(1, Math.ceil((MATE - playedScore) / 2))}.`);
    } else if (playedScore < -(MATE - 1000)) {
      parts.push('Allows a forced mate.');
    }
    if (!inBook && best && best.san !== played.san) {
      if (quality === 'blunder') parts.push(`A serious error — ${best.san} was much stronger.`);
      else if (quality === 'mistake') parts.push(`This gives away a clear advantage; ${best.san} was better.`);
      else if (quality === 'inaccuracy') parts.push(`Slightly imprecise; ${best.san} was more accurate.`);
    } else if (!inBook && quality === 'best' && res.scored.length > 1) {
      parts.push('The strongest move in the position.');
    }
  }
  if (parts.length === 0) parts.push('A quiet, solid move.');

  return {
    ply,
    san: played.san,
    color,
    quality,
    cpLoss,
    evalAfter: formatScore(whiteAfter),
    bestSan: best?.san ?? null,
    opening: completed?.name ?? (inBook ? named?.name ?? null : null),
    comment: parts.join(' '),
  };
}
