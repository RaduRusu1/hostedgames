export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const games = await prisma.game.findMany({
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        uploadedAt: true,
        cloudStoragePath: true,
      },
    });
    return NextResponse.json(games);
  } catch (err: any) {
    console.error('Games list error:', err);
    return NextResponse.json({ error: 'Failed to load games' }, { status: 500 });
  }
}
