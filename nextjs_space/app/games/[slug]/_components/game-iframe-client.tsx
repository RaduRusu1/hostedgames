'use client';

import { ArrowLeft, Maximize2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

type Props = {
  game: {
    name: string;
    slug: string;
    description: string | null;
  };
};

export function GameIframeClient({ game }: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const iframeSrc = `/api/games/serve/${game.slug}/index.html`;

  return (
    <div className={fullscreen ? 'fixed inset-0 z-50 bg-background' : 'max-w-[1200px] mx-auto px-4 py-8'}>
      {!fullscreen && (
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="p-2 rounded-lg hover:bg-secondary transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold">{game.name}</h1>
            {game.description && <p className="text-sm text-muted-foreground">{game.description}</p>}
          </div>
          <button
            onClick={() => setFullscreen(true)}
            className="ml-auto p-2 rounded-lg hover:bg-secondary transition-all"
            title="Fullscreen"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className={fullscreen ? 'w-full h-full' : 'w-full aspect-video rounded-xl overflow-hidden border border-border shadow-lg'}>
        <iframe
          src={iframeSrc}
          className="w-full h-full border-0"
          title={game.name}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>

      {fullscreen && (
        <button
          onClick={() => setFullscreen(false)}
          className="fixed top-4 right-4 z-50 px-3 py-2 rounded-lg bg-card/90 backdrop-blur text-sm font-medium hover:bg-card transition-all shadow-lg border border-border"
        >
          Exit Fullscreen
        </button>
      )}
    </div>
  );
}
