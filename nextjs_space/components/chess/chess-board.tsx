'use client';

import dynamic from 'next/dynamic';
import type { CSSProperties } from 'react';

const Chessboard = dynamic(() => import('react-chessboard').then((m) => m.Chessboard), {
  ssr: false,
  loading: () => <div className="w-full aspect-square bg-secondary rounded-xl animate-pulse" />,
});

export type BoardArrow = { startSquare: string; endSquare: string; color: string };

type Props = {
  id: string;
  fen: string;
  orientation: 'white' | 'black';
  allowDragging: boolean;
  /** Return true if the move was accepted. */
  onMove: (from: string, to: string, pieceType: string) => boolean;
  lastMove?: { from: string; to: string } | null;
  arrows?: BoardArrow[];
};

export function ChessBoard({ id, fen, orientation, allowDragging, onMove, lastMove, arrows = [] }: Props) {
  const squareStyles: Record<string, CSSProperties> = {};
  if (lastMove) {
    squareStyles[lastMove.from] = { backgroundColor: 'rgba(34, 211, 238, 0.35)' };
    squareStyles[lastMove.to] = { backgroundColor: 'rgba(34, 211, 238, 0.5)' };
  }
  return (
    <div className="w-full max-w-[560px] mx-auto rounded-lg overflow-hidden shadow-xl shadow-primary/10">
      <Chessboard
        options={{
          id,
          position: fen,
          boardOrientation: orientation,
          allowDragging,
          arrows,
          clearArrowsOnPositionChange: true,
          squareStyles,
          darkSquareStyle: { backgroundColor: '#6d28d9' },
          lightSquareStyle: { backgroundColor: '#c4b5fd' },
          onPieceDrop: ({ piece, sourceSquare, targetSquare }) => {
            if (!targetSquare || sourceSquare === targetSquare) return false;
            return onMove(sourceSquare, targetSquare, piece?.pieceType ?? '');
          },
        }}
      />
    </div>
  );
}

/** Promotion piece to use for a drop (auto-queen). */
export function promotionFor(pieceType: string, to: string): 'q' | undefined {
  return pieceType?.[1] === 'P' && (to[1] === '8' || to[1] === '1') ? 'q' : undefined;
}
