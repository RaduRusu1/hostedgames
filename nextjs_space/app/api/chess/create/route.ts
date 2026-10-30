export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Must be logged in to create a game' }, { status: 401 });
    }

    const game = await prisma.chessGame.create({
      data: {
        whitePlayerId: session.user.id,
        status: 'waiting',
      },
    });

    return NextResponse.json({ id: game.id });
  } catch (err: any) {
    console.error('Chess create error:', err);
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
}
