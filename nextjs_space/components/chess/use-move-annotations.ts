'use client';

import { useEffect, useRef, useState } from 'react';
import type { MoveAnnotation } from '@/lib/chess-engine/commentary';

/**
 * Incrementally annotates every move of a game in the background.
 * Results are cached per move-sequence prefix, so undo never recomputes.
 */
export function useMoveAnnotations(
  sans: string[],
  analyze: (sans: string[], ply: number) => Promise<MoveAnnotation>,
  enabled = true,
) {
  const [cache, setCache] = useState<Record<string, MoveAnnotation>>({});
  const cacheRef = useRef<Record<string, MoveAnnotation>>({});
  const latest = useRef<string[]>(sans);
  const busy = useRef(false);
  const mounted = useRef(true);
  const key = sans.join(' ');

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    latest.current = key ? key.split(' ') : [];
    if (!enabled || busy.current) return;
    busy.current = true;
    (async () => {
      try {
        while (mounted.current) {
          const cur = latest.current;
          let ply = -1;
          for (let i = 0; i < cur.length; i++) {
            if (!cacheRef.current[cur.slice(0, i + 1).join(' ')]) { ply = i; break; }
          }
          if (ply < 0) break;
          const prefix = cur.slice(0, ply + 1);
          try {
            const ann = await analyze(prefix, ply);
            cacheRef.current = { ...cacheRef.current, [prefix.join(' ')]: ann };
            if (mounted.current) setCache(cacheRef.current);
          } catch (err) {
            console.error('Move analysis failed:', err);
            break;
          }
        }
      } finally {
        busy.current = false;
      }
    })();
  }, [key, analyze, enabled]);

  return sans.map((_, i) => cache[sans.slice(0, i + 1).join(' ')] ?? null);
}
