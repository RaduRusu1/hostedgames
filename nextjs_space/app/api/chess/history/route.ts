export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const games = await prisma.chessGame.findMany({
      where: { status: { in: ['completed', 'draw', 'resigned'] } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        whitePlayer: { select: { id: true, username: true } },
        blackPlayer: { select: { id: true, username: true } },
        winner: { select: { id: true, username: true } },
      },
    });

    return NextResponse.json(games.map((g: any) => ({
      id: g.id,
      status: g.status,
      whitePlayer: g.whitePlayer,
      blackPlayer: g.blackPlayer,
      winner: g.winner,
      pgn: g.pgn,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    })));
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
  }
}
