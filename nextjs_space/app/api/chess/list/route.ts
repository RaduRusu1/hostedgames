export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const games = await prisma.chessGame.findMany({
      where: { status: { in: ['waiting', 'active'] } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        whitePlayer: { select: { id: true, username: true } },
        blackPlayer: { select: { id: true, username: true } },
      },
    });

    return NextResponse.json(games.map((g: any) => ({
      id: g.id,
      status: g.status,
      whitePlayer: g.whitePlayer,
      blackPlayer: g.blackPlayer,
      createdAt: g.createdAt.toISOString(),
    })));
  } catch (err: any) {
    console.error('Chess list error:', err);
    return NextResponse.json({ error: 'Failed to list games' }, { status: 500 });
  }
}
