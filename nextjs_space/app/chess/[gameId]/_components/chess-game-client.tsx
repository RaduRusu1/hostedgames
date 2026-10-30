'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Flag, Handshake, ArrowLeft, RotateCcw, Copy } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Chess } from 'chess.js';
import { ChessBoard, promotionFor } from '@/components/chess/chess-board';
import { CommentaryPanel } from '@/components/chess/commentary-panel';
import { useMoveAnnotations } from '@/components/chess/use-move-annotations';
import { useChessEngine } from '@/lib/chess-engine/use-chess-engine';

type ChessGameData = {
  id: string;
  currentFen: string;
  pgn: string;
  status: string;
  whitePlayer: { id: string; username: string } | null;
  blackPlayer: { id: string; username: string } | null;
  winner: { id: string; username: string } | null;
  moveHistory: any[];
  fenHistory: string[];
  updatedAt: string;
};

export function ChessGameClient({ gameId }: { gameId: string }) {
  const { data: session } = useSession();
  const [game, setGame] = useState<ChessGameData | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/chess/poll?gameId=${gameId}`);
      if (res.ok) {
        const data = await res.json();
        setGame(data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [gameId]);

  useEffect(() => {
    fetchGame();
    pollRef.current = setInterval(fetchGame, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchGame]);

  const userId = session?.user?.id;
  const isWhite = game?.whitePlayer?.id === userId;
  const isBlack = game?.blackPlayer?.id === userId;
  const isPlayer = isWhite || isBlack;
  const isActive = game?.status === 'active';
  const isWaiting = game?.status === 'waiting';

  // Determine whose turn it is from FEN
  const fenParts = (game?.currentFen ?? '').split(' ');
  const turnColor = fenParts?.[1] === 'b' ? 'black' : 'white';
  const isMyTurn = (turnColor === 'white' && isWhite) || (turnColor === 'black' && isBlack);

  const engine = useChessEngine();
  const sans: string[] = (game?.moveHistory ?? []).map((m: any) => m?.san).filter(Boolean);
  const annotations = useMoveAnnotations(sans, engine.analyze, !!game);
  const lastHist = game?.moveHistory?.[game.moveHistory.length - 1];
  const lastMove = lastHist?.from && lastHist?.to ? { from: lastHist.from, to: lastHist.to } : null;

  // Optimistic, locally validated move; the server stays authoritative.
  function onDrop(from: string, to: string, pieceType: string): boolean {
    if (!game || !isPlayer || !isActive || !isMyTurn) return false;
    const local = new Chess(game.currentFen);
    let applied;
    try {
      applied = local.move({ from, to, promotion: promotionFor(pieceType, to) });
    } catch {
      return false;
    }
    if (!applied) return false;
    setGame({
      ...game,
      currentFen: local.fen(),
      moveHistory: [...(game.moveHistory ?? []), { san: applied.san, from, to }],
    });
    fetch('/api/chess/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, from, to, promotion: promotionFor(pieceType, to) }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data?.error ?? 'Move rejected');
        }
      })
      .catch((err) => {
        console.error('Move failed:', err);
        toast.error('Network error — move not saved');
      })
      .finally(() => fetchGame());
    return true;
  }

  async function handleResign() {
    if (!confirm('Are you sure you want to resign?')) return;
    await fetch('/api/chess/resign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId }),
    });
    fetchGame();
  }

  async function handleDraw() {
    if (!confirm('Offer a draw? (It will be immediately accepted)')) return;
    await fetch('/api/chess/draw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId }),
    });
    fetchGame();
  }

  function copyGameLink() {
    navigator?.clipboard?.writeText?.(window?.location?.href ?? '');
    toast?.('Game link copied!');
  }

  const gameOver = ['completed', 'draw', 'resigned'].includes(game?.status ?? '');

  function getStatusText() {
    if (!game) return '';
    if (game.status === 'waiting') return 'Waiting for opponent to join...';
    if (game.status === 'completed') return `Checkmate! ${game.winner?.username ?? 'Unknown'} wins!`;
    if (game.status === 'draw') return 'Game ended in a draw';
    if (game.status === 'resigned') return `${game.winner?.username ?? 'Unknown'} wins by resignation`;
    if (isMyTurn) return 'Your turn';
    return `Waiting for ${turnColor === 'white' ? game.whitePlayer?.username : game.blackPlayer?.username}...`;
  }

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 py-8">
        <div className="w-full max-w-lg mx-auto aspect-square bg-card rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 py-20 text-center text-muted-foreground">
        <p className="text-lg">Game not found</p>
        <Link href="/chess" className="text-primary hover:underline mt-2 inline-block">Back to lobby</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-3 mb-6">
          <Link href="/chess" className="p-2 rounded-lg hover:bg-secondary transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-xl font-bold">Chess Game</h1>
          <button onClick={copyGameLink} className="p-2 rounded-lg hover:bg-secondary transition-all" title="Copy link">
            <Copy className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Board */}
          <div className="lg:col-span-2">
            <div className="max-w-lg mx-auto">
              <ChessBoard
                id={`pvp-${game.id}`}
                fen={game.currentFen}
                orientation={isBlack ? 'black' : 'white'}
                allowDragging={isActive && isPlayer && isMyTurn}
                onMove={onDrop}
                lastMove={lastMove}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Players */}
            <div className="bg-card rounded-xl p-4 shadow-md border border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Players</h3>
              <div className="space-y-2">
                <div className={`flex items-center gap-2 p-2 rounded-lg ${turnColor === 'white' && isActive ? 'bg-primary/10 border border-primary/30' : 'bg-secondary'}`}>
                  <div className="w-4 h-4 rounded-full bg-white border border-border" />
                  <span className="font-medium text-sm">{game.whitePlayer?.username ?? 'Unknown'}</span>
                  {turnColor === 'white' && isActive && <span className="text-xs text-primary ml-auto">turn</span>}
                </div>
                <div className={`flex items-center gap-2 p-2 rounded-lg ${turnColor === 'black' && isActive ? 'bg-primary/10 border border-primary/30' : 'bg-secondary'}`}>
                  <div className="w-4 h-4 rounded-full bg-gray-800 border border-border" />
                  <span className="font-medium text-sm">{game.blackPlayer?.username ?? (isWaiting ? 'Waiting...' : 'Unknown')}</span>
                  {turnColor === 'black' && isActive && <span className="text-xs text-primary ml-auto">turn</span>}
                </div>
              </div>
            </div>

            {/* Status */}
            <div className={`rounded-xl p-4 shadow-md border text-center font-medium text-sm ${
              gameOver
                ? 'bg-primary/10 border-primary/30 text-primary'
                : isMyTurn
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-card border-border text-muted-foreground'
            }`}>
              {getStatusText()}
            </div>

            {/* Actions */}
            {isPlayer && isActive && (
              <div className="flex gap-2">
                <button
                  onClick={handleResign}
                  className="flex-1 px-3 py-2.5 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-all flex items-center justify-center gap-2"
                >
                  <Flag className="w-4 h-4" /> Resign
                </button>
                <button
                  onClick={handleDraw}
                  className="flex-1 px-3 py-2.5 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-all flex items-center justify-center gap-2"
                >
                  <Handshake className="w-4 h-4" /> Draw
                </button>
              </div>
            )}

            {/* Move History */}
            <div className="bg-card rounded-xl p-4 shadow-md border border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Moves
              </h3>
              <div className="max-h-60 overflow-y-auto">
                {(game.moveHistory?.length ?? 0) === 0 ? (
                  <p className="text-xs text-muted-foreground">No moves yet</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                    {(game.moveHistory ?? []).map((move: any, i: number) => (
                      <div key={i} className={`px-2 py-1 rounded ${i % 2 === 0 ? 'bg-secondary' : ''}`}>
                        {i % 2 === 0 && <span className="text-muted-foreground mr-1">{Math.floor(i / 2) + 1}.</span>}
                        {move?.san ?? '?'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <CommentaryPanel sans={sans} annotations={annotations} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
