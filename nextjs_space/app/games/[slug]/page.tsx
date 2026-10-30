export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { GameIframeClient } from './_components/game-iframe-client';

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const game = await prisma.game.findUnique({ where: { slug } });
  if (!game || !game.cloudStoragePath) notFound();

  // Fresh cache-buster per visit so a re-uploaded game's entry page is never served stale.
  const version = Date.now().toString(36);
  return <GameIframeClient game={{ name: game.name, slug: game.slug, description: game.description }} version={version} />;
}
