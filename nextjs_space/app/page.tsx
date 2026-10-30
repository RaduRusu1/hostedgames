export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { HomeClient } from './_components/home-client';

export default async function HomePage() {
  const games = await prisma.game.findMany({
    orderBy: { uploadedAt: 'desc' },
    select: { id: true, name: true, slug: true, description: true, cloudStoragePath: true },
  });

  return <HomeClient games={games} />;
}
