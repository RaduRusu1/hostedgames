'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { SearchResult } from './engine';
import type { MoveAnnotation } from './commentary';

type Pending = { resolve: (v: any) => void; reject: (e: Error) => void };
type Payload =
  | { type: 'bestMove'; sans: string[]; level: number }
  | { type: 'suggest'; sans: string[] }
  | { type: 'analyze'; sans: string[]; ply: number };
type Channel = 'play' | 'analysis';

/**
 * Runs the TypeScript chess engine in Web Workers so the UI stays responsive.
 * One worker plays/suggests, a second one annotates moves in the background.
 * Falls back to the main thread if workers are unavailable.
 */
export function useChessEngine() {
  const workers = useRef<Partial<Record<Channel, Worker>>>({});
  const pending = useRef(new Map<number, Pending>());
  const nextId = useRef(1);

  useEffect(() => {
    const map = pending.current;
    const created: Worker[] = [];
    for (const ch of ['play', 'analysis'] as Channel[]) {
      try {
        const w = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
        w.onmessage = (e: MessageEvent<{ id: number; ok: boolean; result?: unknown; error?: string }>) => {
          const p = map.get(e.data.id);
          if (!p) return;
          map.delete(e.data.id);
          if (e.data.ok) p.resolve(e.data.result);
          else p.reject(new Error(e.data.error ?? 'Engine error'));
        };
        w.onerror = (e) => console.error('Chess engine worker error:', e?.message ?? e);
        workers.current[ch] = w;
        created.push(w);
      } catch (err) {
        console.error('Chess engine worker unavailable, using main thread:', err);
      }
    }
    return () => {
      created.forEach((w) => w.terminate());
      workers.current = {};
      map.forEach((p) => p.reject(new Error('Engine stopped')));
      map.clear();
    };
  }, []);

  const run = useCallback(async (channel: Channel, payload: Payload): Promise<any> => {
    const worker = workers.current[channel];
    if (worker) {
      const id = nextId.current++;
      return new Promise((resolve, reject) => {
        pending.current.set(id, { resolve, reject });
        worker.postMessage({ id, ...payload });
      });
    }
    await new Promise((r) => setTimeout(r, 20));
    const engine = await import('./engine');
    if (payload.type === 'bestMove') return engine.findBestMove(payload.sans, payload.level);
    if (payload.type === 'suggest') return engine.suggestMove(payload.sans);
    const { analyzeMove } = await import('./commentary');
    return analyzeMove(payload.sans, payload.ply);
  }, []);

  const bestMove = useCallback((sans: string[], level: number) => run('play', { type: 'bestMove', sans, level }) as Promise<SearchResult>, [run]);
  const suggest = useCallback((sans: string[]) => run('play', { type: 'suggest', sans }) as Promise<SearchResult>, [run]);
  const analyze = useCallback((sans: string[], ply: number) => run('analysis', { type: 'analyze', sans, ply }) as Promise<MoveAnnotation>, [run]);

  return useMemo(() => ({ bestMove, suggest, analyze }), [bestMove, suggest, analyze]);
}
