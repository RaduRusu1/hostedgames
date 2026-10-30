export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const gameId = req.nextUrl.searchParams.get('gameId');
    if (!gameId) return NextResponse.json({ error: 'gameId required' }, { status: 400 });

    const game = await prisma.chessGame.findUnique({
      where: { id: gameId },
      include: {
        whitePlayer: { select: { id: true, username: true } },
        blackPlayer: { select: { id: true, username: true } },
        winner: { select: { id: true, username: true } },
      },
    });

    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

    return NextResponse.json({
      id: game.id,
      currentFen: game.currentFen,
      pgn: game.pgn,
      status: game.status,
      whitePlayer: game.whitePlayer,
      blackPlayer: game.blackPlayer,
      winner: game.winner,
      moveHistory: game.moveHistory,
      fenHistory: game.fenHistory,
      updatedAt: game.updatedAt.toISOString(),
    });
  } catch (err: any) {
    console.error('Chess poll error:', err);
    return NextResponse.json({ error: 'Failed to poll game' }, { status: 500 });
  }
}
