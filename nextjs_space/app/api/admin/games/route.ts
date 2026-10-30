export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const games = await prisma.game.findMany({
    orderBy: { uploadedAt: 'desc' },
    include: {
      uploader: { select: { username: true } },
      _count: { select: { scores: true } },
    },
  });

  return NextResponse.json(games);
}
