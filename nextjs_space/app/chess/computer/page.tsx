import { Suspense } from 'react';
import { ComputerGameClient } from './_components/computer-game-client';

export const metadata = { title: 'Play vs Computer · Chess · HostedGames' };

export default function ComputerChessPage() {
  return (
    <Suspense fallback={<div className="max-w-[1200px] mx-auto px-4 py-8"><div className="w-full max-w-lg mx-auto aspect-square bg-card rounded-xl animate-pulse" /></div>}>
      <ComputerGameClient />
    </Suspense>
  );
}
