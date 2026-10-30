export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Chess } from 'chess.js';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Must be logged in' }, { status: 401 });
    }

    const { gameId, from, to, promotion } = await req.json();
    if (!gameId || !from || !to) {
      return NextResponse.json({ error: 'gameId, from, to required' }, { status: 400 });
    }

    const game = await prisma.chessGame.findUnique({
      where: { id: gameId },
      include: { whitePlayer: true, blackPlayer: true },
    });

    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    if (game.status !== 'active') return NextResponse.json({ error: 'Game not active' }, { status: 400 });

    const chess = new Chess(game.currentFen);
    const turn = chess.turn(); // 'w' or 'b'
    const isWhite = game.whitePlayerId === session.user.id;
    const isBlack = game.blackPlayerId === session.user.id;

    if ((turn === 'w' && !isWhite) || (turn === 'b' && !isBlack)) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 400 });
    }

    const moveResult = chess.move({ from, to, promotion: promotion ?? 'q' });
    if (!moveResult) {
      return NextResponse.json({ error: 'Invalid move' }, { status: 400 });
    }

    const fenHistory = Array.isArray(game.fenHistory) ? [...(game.fenHistory as string[])] : [];
    fenHistory.push(chess.fen());

    const moveHistory = Array.isArray(game.moveHistory) ? [...(game.moveHistory as any[])] : [];
    moveHistory.push({ from, to, promotion: promotion ?? undefined, san: moveResult.san });

    let status = 'active';
    let winnerId: string | null = null;

    if (chess.isCheckmate()) {
      status = 'completed';
      winnerId = turn === 'w' ? game.whitePlayerId : (game.blackPlayerId ?? null);
    } else if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
      status = 'draw';
    }

    await prisma.chessGame.update({
      where: { id: gameId },
      data: {
        currentFen: chess.fen(),
        pgn: chess.pgn(),
        fenHistory,
        moveHistory,
        status,
        winnerId,
      },
    });

    return NextResponse.json({
      fen: chess.fen(),
      pgn: chess.pgn(),
      status,
      winnerId,
      lastMove: moveResult.san,
    });
  } catch (err: any) {
    console.error('Chess move error:', err);
    return NextResponse.json({ error: 'Failed to make move' }, { status: 500 });
  }
}
