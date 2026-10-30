'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Plus, Clock, Users, History, LogIn, Cpu, X } from 'lucide-react';
import { SafeDate } from '@/components/safe-format';
import { LEVEL_LABELS } from '@/lib/chess-engine/engine';

type LobbyGame = {
  id: string;
  status: string;
  whitePlayer: { id: string; username: string };
  blackPlayer: { id: string; username: string } | null;
  createdAt: string;
};

export default function ChessLobbyPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [games, setGames] = useState<LobbyGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [mode, setMode] = useState<'user' | 'computer'>('user');
  const [level, setLevel] = useState(5);
  const [color, setColor] = useState<'white' | 'black' | 'random'>('white');

  function startComputerGame() {
    router.push(`/chess/computer?level=${level}&color=${color}`);
  }

  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch('/api/chess/list');
      if (res.ok) {
        const data = await res.json();
        setGames(data ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 5000);
    return () => clearInterval(interval);
  }, [fetchGames]);

  async function createGame() {
    setCreating(true);
    try {
      const res = await fetch('/api/chess/create', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data?.id) {
        router.push(`/chess/${data.id}`);
      }
    } catch { /* ignore */ }
    setCreating(false);
  }

  async function joinGame(gameId: string) {
    try {
      const res = await fetch('/api/chess/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
      if (res.ok) {
        router.push(`/chess/${gameId}`);
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
              <Swords className="w-8 h-8 text-primary" /> Chess Lobby
            </h1>
            <p className="text-muted-foreground mt-1">Play another player, or challenge the computer (levels 1–10)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/chess/history" className="px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-all flex items-center gap-2 text-sm">
              <History className="w-4 h-4" /> Game History
            </Link>
            <Link href="/chess/computer" className="px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-all flex items-center gap-2 text-sm">
              <Cpu className="w-4 h-4" /> Resume vs Computer
            </Link>
            <button
              onClick={() => { setMode(session?.user ? 'user' : 'computer'); setChooserOpen(true); }}
              disabled={creating}
              className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> {creating ? 'Creating...' : 'New Game'}
            </button>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i: number) => <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : (games?.length ?? 0) === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Swords className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg">No games in the lobby</p>
          <p className="text-sm">Create a new game to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(games ?? []).map((game: LobbyGame, i: number) => {
            const isMyGame = game.whitePlayer?.id === session?.user?.id || game.blackPlayer?.id === session?.user?.id;
            const canJoin = session?.user && game.status === 'waiting' && game.whitePlayer?.id !== session?.user?.id;

            return (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl p-4 shadow-md border border-border hover:border-primary/30 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${game.status === 'waiting' ? 'bg-amber-500/10 text-amber-400' : 'bg-green-500/10 text-green-400'}`}>
                    {game.status === 'waiting' ? <Clock className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-medium">
                      <span className="text-foreground">{game.whitePlayer?.username ?? 'Unknown'}</span>
                      <span className="text-muted-foreground mx-2">vs</span>
                      <span className="text-foreground">{game.blackPlayer?.username ?? '...'}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <SafeDate date={game.createdAt} options={{ dateStyle: 'medium', timeStyle: 'short' }} />
                    </div>
                  </div>
                </div>
                <div>
                  {isMyGame || game.status === 'active' ? (
                    <Link
                      href={`/chess/${game.id}`}
                      className="px-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-all"
                    >
                      {isMyGame ? 'Continue' : 'Spectate'}
                    </Link>
                  ) : canJoin ? (
                    <button
                      onClick={() => joinGame(game.id)}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
                    >
                      Join Game
                    </button>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {chooserOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setChooserOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-xl font-bold">New Chess Game</h2>
                <button onClick={() => setChooserOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-muted-foreground mb-3">Who do you want to play?</p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  onClick={() => setMode('user')}
                  className={`p-4 rounded-xl border text-left transition-all ${mode === 'user' ? 'border-primary bg-primary/10' : 'border-border bg-secondary hover:border-primary/40'}`}
                >
                  <Users className="w-6 h-6 text-primary mb-2" />
                  <div className="font-semibold text-sm">Another player</div>
                  <div className="text-xs text-muted-foreground">Turn-based, saved to history</div>
                </button>
                <button
                  onClick={() => setMode('computer')}
                  className={`p-4 rounded-xl border text-left transition-all ${mode === 'computer' ? 'border-primary bg-primary/10' : 'border-border bg-secondary hover:border-primary/40'}`}
                >
                  <Cpu className="w-6 h-6 text-accent mb-2" />
                  <div className="font-semibold text-sm">The computer</div>
                  <div className="text-xs text-muted-foreground">Levels 1–10, undo & hints</div>
                </button>
              </div>

              {mode === 'computer' ? (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Difficulty</span>
                      <span className="font-semibold">Level {level} · {LEVEL_LABELS[level]}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={level}
                      onChange={(e) => setLevel(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>1 · Easy</span><span>10 · Hard</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Play as</div>
                    <div className="grid grid-cols-3 gap-2">
                      {(['white', 'black', 'random'] as const).map((c) => (
                        <button
                          key={c}
                          onClick={() => setColor(c)}
                          className={`py-2 rounded-lg text-sm capitalize border transition-all ${color === c ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-secondary text-muted-foreground hover:text-foreground'}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={startComputerGame}
                    className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                  >
                    <Cpu className="w-4 h-4" /> Start vs Computer
                  </button>
                  {!session?.user && (
                    <p className="text-xs text-muted-foreground text-center">Guest mode: games vs the computer are kept in this browser only.</p>
                  )}
                </div>
              ) : session?.user ? (
                <button
                  onClick={() => { setChooserOpen(false); createGame(); }}
                  disabled={creating}
                  className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Users className="w-4 h-4" /> Create game & wait for opponent
                </button>
              ) : (
                <Link
                  href="/login"
                  className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" /> Login to play other users
                </Link>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
