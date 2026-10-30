'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Chess } from 'chess.js';
import { ArrowLeft, Cpu, Undo2, Lightbulb, RotateCcw, Flag, Loader2, User } from 'lucide-react';
import { ChessBoard, promotionFor, type BoardArrow } from '@/components/chess/chess-board';
import { CommentaryPanel } from '@/components/chess/commentary-panel';
import { useMoveAnnotations } from '@/components/chess/use-move-annotations';
import { useChessEngine } from '@/lib/chess-engine/use-chess-engine';
import { LEVEL_LABELS, formatScore } from '@/lib/chess-engine/engine';

type Color = 'w' | 'b';
type Saved = { sans: string[]; level: number; human: Color; resigned?: boolean };
const STORAGE_KEY = 'hostedgames-chess-computer';

function buildGame(sans: string[]) {
  const g = new Chess();
  for (const s of sans) g.move(s);
  return g;
}

export function ComputerGameClient() {
  const router = useRouter();
  const params = useSearchParams();
  const engine = useChessEngine();

  const [ready, setReady] = useState(false);
  const [sans, setSans] = useState<string[]>([]);
  const [level, setLevel] = useState(5);
  const [human, setHuman] = useState<Color>('w');
  const [resigned, setResigned] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{ san: string; from: string; to: string; eval: string; depth: number } | null>(null);
  const generation = useRef(0);

  // Initialise from query string (new game) or resume from localStorage.
  useEffect(() => {
    const qLevel = Number(params.get('level'));
    const qColor = params.get('color');
    if (qLevel || qColor) {
      const lvl = Math.min(10, Math.max(1, Math.round(qLevel || 5)));
      const col: Color = qColor === 'black' ? 'b' : qColor === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : 'w';
      setLevel(lvl);
      setHuman(col);
      setSans([]);
      router.replace('/chess/computer');
    } else {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Saved | null;
        if (saved && Array.isArray(saved.sans)) {
          buildGame(saved.sans); // validates
          setSans(saved.sans);
          setLevel(saved.level ?? 5);
          setHuman(saved.human === 'b' ? 'b' : 'w');
          setResigned(!!saved.resigned);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sans, level, human, resigned } satisfies Saved));
  }, [ready, sans, level, human, resigned]);

  const game = useMemo(() => buildGame(sans), [sans]);
  const turn = game.turn() as Color;
  const gameOver = resigned || game.isGameOver();
  const humanTurn = turn === human && !gameOver;
  const lastMove = useMemo(() => {
    const h = game.history({ verbose: true });
    const m = h[h.length - 1];
    return m ? { from: m.from, to: m.to } : null;
  }, [game]);

  // Computer move
  useEffect(() => {
    if (!ready || gameOver || turn === human) return;
    const gen = ++generation.current;
    setThinking(true);
    const started = Date.now();
    engine.bestMove(sans, level).then(async (res) => {
      const wait = 350 - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      if (gen !== generation.current || !res?.best) return;
      setSans((prev) => (prev.join(' ') === sans.join(' ') ? [...prev, res.best!.san] : prev));
    }).catch((err) => {
      if (gen === generation.current) console.error('Engine move failed:', err);
    }).finally(() => {
      if (gen === generation.current) setThinking(false);
    });
  }, [ready, sans, level, human, turn, gameOver, engine]);

  const annotations = useMoveAnnotations(sans, engine.analyze, ready);

  const onMove = useCallback((from: string, to: string, pieceType: string) => {
    if (!humanTurn || thinking) return false;
    const g = buildGame(sans);
    try {
      const mv = g.move({ from, to, promotion: promotionFor(pieceType, to) });
      setSuggestion(null);
      setSans([...sans, mv.san]);
      return true;
    } catch {
      return false;
    }
  }, [humanTurn, thinking, sans]);

  function undo() {
    // Remove the human's most recent move and everything after it.
    const humanParity = human === 'w' ? 0 : 1;
    let i = sans.length - 1;
    while (i >= 0 && i % 2 !== humanParity) i--;
    if (i < 0) return;
    generation.current++;
    setThinking(false);
    setSuggestion(null);
    setResigned(false);
    setSans(sans.slice(0, i));
  }

  async function suggest() {
    if (!humanTurn || suggesting) return;
    setSuggesting(true);
    try {
      const res = await engine.suggest(sans);
      if (res?.best) {
        const white = turn === 'w' ? res.best.score : -res.best.score;
        setSuggestion({ san: res.best.san, from: res.best.from, to: res.best.to, eval: formatScore(white), depth: res.depth });
      }
    } catch (err) {
      console.error('Suggestion failed:', err);
    }
    setSuggesting(false);
  }

  function newGame(color: Color = human) {
    generation.current++;
    setThinking(false);
    setSuggestion(null);
    setResigned(false);
    setHuman(color);
    setSans([]);
  }

  function resign() {
    if (gameOver || !confirm('Resign this game?')) return;
    generation.current++;
    setThinking(false);
    setResigned(true);
  }

  const arrows: BoardArrow[] = suggestion ? [{ startSquare: suggestion.from, endSquare: suggestion.to, color: '#22d3ee' }] : [];
  const canUndo = sans.some((_, i) => i % 2 === (human === 'w' ? 0 : 1));

  function statusText() {
    if (resigned) return 'You resigned — the computer wins.';
    if (game.isCheckmate()) return turn === human ? 'Checkmate — the computer wins.' : 'Checkmate — you win! 🎉';
    if (game.isStalemate()) return 'Stalemate — draw.';
    if (game.isThreefoldRepetition()) return 'Threefold repetition — draw.';
    if (game.isInsufficientMaterial()) return 'Insufficient material — draw.';
    if (game.isDraw()) return 'Draw.';
    if (thinking) return 'Computer is thinking…';
    return game.inCheck() ? 'Your move — you are in check!' : 'Your move';
  }

  const won = game.isCheckmate() && turn !== human;

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Link href="/chess" className="p-2 rounded-lg hover:bg-secondary transition-all" aria-label="Back to lobby">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-xl font-bold flex items-center gap-2">
            <Cpu className="w-5 h-5 text-accent" /> Play vs Computer
          </h1>
          <span className="text-xs px-2 py-1 rounded-full bg-primary/15 text-primary font-medium">
            Level {level} · {LEVEL_LABELS[level]}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between max-w-[560px] mx-auto text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Cpu className="w-4 h-4" /> Computer ({human === 'w' ? 'Black' : 'White'})
                {thinking && <Loader2 className="w-4 h-4 animate-spin text-accent" />}
              </span>
            </div>
            <ChessBoard
              id="computer-board"
              fen={game.fen()}
              orientation={human === 'w' ? 'white' : 'black'}
              allowDragging={humanTurn && !thinking}
              onMove={onMove}
              lastMove={lastMove}
              arrows={arrows}
            />
            <div className="flex items-center max-w-[560px] mx-auto text-sm text-muted-foreground gap-2">
              <User className="w-4 h-4" /> You ({human === 'w' ? 'White' : 'Black'})
            </div>
          </div>

          <div className="space-y-4">
            <div className={`rounded-xl p-4 shadow-md border text-center font-medium text-sm ${
              gameOver ? (won ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-primary/10 border-primary/30 text-primary')
                : humanTurn ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-card border-border text-muted-foreground'
            }`}>
              {statusText()}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={undo} disabled={!canUndo}
                className="px-3 py-2.5 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-all flex items-center justify-center gap-2 disabled:opacity-40">
                <Undo2 className="w-4 h-4" /> Undo
              </button>
              <button onClick={suggest} disabled={!humanTurn || thinking || suggesting}
                className="px-3 py-2.5 rounded-lg bg-accent/15 text-accent text-sm font-medium hover:bg-accent/25 transition-all flex items-center justify-center gap-2 disabled:opacity-40">
                {suggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />} Suggest
              </button>
              <button onClick={() => newGame()}
                className="px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> New Game
              </button>
              <button onClick={resign} disabled={gameOver}
                className="px-3 py-2.5 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40">
                <Flag className="w-4 h-4" /> Resign
              </button>
            </div>

            {suggestion && (
              <div className="rounded-xl p-3 border border-accent/30 bg-accent/10 text-sm">
                <div className="flex items-center gap-2 text-accent font-medium">
                  <Lightbulb className="w-4 h-4" /> Suggested: <span className="font-mono">{suggestion.san}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Evaluation after this move: <span className="font-mono">{suggestion.eval}</span> (searched {suggestion.depth} plies deep). The arrow on the board shows the move.
                </p>
              </div>
            )}

            <div className="bg-card rounded-xl p-4 shadow-md border border-border space-y-3">
              <label htmlFor="level" className="text-sm font-medium text-muted-foreground flex justify-between">
                <span>Difficulty</span>
                <span className="text-foreground">{level} · {LEVEL_LABELS[level]}</span>
              </label>
              <input id="level" type="range" min={1} max={10} step={1} value={level}
                onChange={(e) => setLevel(Number(e.target.value))} className="w-full accent-[hsl(var(--primary))]" />
              <div className="flex justify-between text-[10px] text-muted-foreground"><span>1 Easy</span><span>10 Hard</span></div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => newGame('w')} className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${human === 'w' ? 'bg-primary/20 text-primary' : 'bg-secondary hover:bg-secondary/80'}`}>
                  New as White
                </button>
                <button onClick={() => newGame('b')} className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${human === 'b' ? 'bg-primary/20 text-primary' : 'bg-secondary hover:bg-secondary/80'}`}>
                  New as Black
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">Changing the level applies from the computer’s next move. Games vs the computer are saved in this browser only.</p>
            </div>

            <CommentaryPanel sans={sans} annotations={annotations} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
