export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Must be logged in' }, { status: 401 });
    }

    const { gameId } = await req.json();
    if (!gameId) {
      return NextResponse.json({ error: 'gameId required' }, { status: 400 });
    }

    const game = await prisma.chessGame.findUnique({ where: { id: gameId } });
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    if (game.status !== 'waiting') {
      return NextResponse.json({ error: 'Game already started or finished' }, { status: 400 });
    }
    if (game.whitePlayerId === session.user.id) {
      return NextResponse.json({ error: 'Cannot join your own game' }, { status: 400 });
    }

    await prisma.chessGame.update({
      where: { id: gameId },
      data: {
        blackPlayerId: session.user.id,
        status: 'active',
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Chess join error:', err);
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
  }
}
