export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Must be logged in' }, { status: 401 });

    const { gameId } = await req.json();
    const game = await prisma.chessGame.findUnique({ where: { id: gameId } });
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    if (game.status !== 'active') return NextResponse.json({ error: 'Game not active' }, { status: 400 });

    const isWhite = game.whitePlayerId === session.user.id;
    const isBlack = game.blackPlayerId === session.user.id;
    if (!isWhite && !isBlack) return NextResponse.json({ error: 'Not a player' }, { status: 403 });

    // For simplicity, draw is offered and immediately accepted
    await prisma.chessGame.update({
      where: { id: gameId },
      data: { status: 'draw' },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to draw' }, { status: 500 });
  }
}
