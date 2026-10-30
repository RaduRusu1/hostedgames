/// <reference lib="webworker" />
import { findBestMove, suggestMove } from './engine';
import { analyzeMove } from './commentary';

export type EngineRequest =
  | { id: number; type: 'bestMove'; sans: string[]; level: number }
  | { id: number; type: 'suggest'; sans: string[] }
  | { id: number; type: 'analyze'; sans: string[]; ply: number };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<EngineRequest>) => {
  const req = e.data;
  try {
    let result: unknown;
    if (req.type === 'bestMove') result = findBestMove(req.sans, req.level);
    else if (req.type === 'suggest') result = suggestMove(req.sans);
    else result = analyzeMove(req.sans, req.ply);
    ctx.postMessage({ id: req.id, ok: true, result });
  } catch (err) {
    ctx.postMessage({ id: req.id, ok: false, error: String((err as Error)?.message ?? err) });
  }
};
