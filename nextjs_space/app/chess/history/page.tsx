'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { History, Trophy, Minus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { SafeDate } from '@/components/safe-format';

type HistoryGame = {
  id: string;
  status: string;
  whitePlayer: { id: string; username: string } | null;
  blackPlayer: { id: string; username: string } | null;
  winner: { id: string; username: string } | null;
  pgn: string;
  createdAt: string;
  updatedAt: string;
};

export default function ChessHistoryPage() {
  const [games, setGames] = useState<HistoryGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/chess/history')
      .then((r: Response) => r.json())
      .then((d: any) => setGames(d ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/chess" className="p-2 rounded-lg hover:bg-secondary transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
            <History className="w-8 h-8 text-primary" /> Game History
          </h1>
          <p className="text-muted-foreground mt-1">All completed chess games</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i: number) => <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : (games?.length ?? 0) === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <History className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No completed games yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(games ?? []).map((game: HistoryGame, i: number) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link href={`/chess/${game.id}`} className="block">
                <div className="bg-card rounded-xl p-4 shadow-md border border-border hover:border-primary/30 transition-all flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      game.status === 'draw' ? 'bg-amber-500/10 text-amber-400' : 'bg-green-500/10 text-green-400'
                    }`}>
                      {game.status === 'draw' ? <Minus className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        <span className={game.winner?.id === game.whitePlayer?.id ? 'text-primary font-bold' : 'text-foreground'}>
                          {game.whitePlayer?.username ?? 'Unknown'}
                        </span>
                        <span className="text-muted-foreground mx-2">vs</span>
                        <span className={game.winner?.id === game.blackPlayer?.id ? 'text-primary font-bold' : 'text-foreground'}>
                          {game.blackPlayer?.username ?? 'Unknown'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {game.status === 'draw' ? 'Draw' : game.status === 'resigned' ? 'Resignation' : 'Checkmate'}
                        {' • '}<SafeDate date={game.updatedAt} options={{ dateStyle: 'medium' }} />
                      </div>
                    </div>
                  </div>
                  {game.winner && (
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">
                      Winner: {game.winner.username}
                    </span>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
