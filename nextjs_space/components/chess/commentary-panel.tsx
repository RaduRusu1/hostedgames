'use client';

import { useEffect, useRef } from 'react';
import { MessageSquareText, BookOpen, Loader2 } from 'lucide-react';
import { QUALITY_META, type MoveAnnotation } from '@/lib/chess-engine/commentary';
import { detectOpening } from '@/lib/chess-engine/openings';

type Props = { sans: string[]; annotations: (MoveAnnotation | null)[]; title?: string };

export function CommentaryPanel({ sans, annotations, title = 'Move Commentary' }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const opening = detectOpening(sans);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [sans.length, annotations.filter(Boolean).length]);

  return (
    <div className="bg-card rounded-xl p-4 shadow-md border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
        <MessageSquareText className="w-4 h-4" /> {title}
      </h3>
      {opening && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-200 text-xs flex items-center gap-2">
          <BookOpen className="w-4 h-4 shrink-0" />
          <span><span className="font-semibold">{opening.eco}</span> · {opening.name}</span>
        </div>
      )}
      <div ref={listRef} className="max-h-80 overflow-y-auto space-y-2 pr-1">
        {sans.length === 0 ? (
          <p className="text-xs text-muted-foreground">No moves yet. Commentary appears here as the game unfolds.</p>
        ) : (
          sans.map((san, i) => {
            const a = annotations[i];
            const meta = a ? QUALITY_META[a.quality] : null;
            const moveNo = `${Math.floor(i / 2) + 1}${i % 2 === 0 ? '.' : '...'}`;
            return (
              <div key={`${i}-${san}`} className="rounded-lg bg-secondary/60 p-2.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground font-mono w-10">{moveNo}</span>
                  <span className="font-mono font-semibold text-foreground">{san}</span>
                  {meta ? (
                    <span className={`ml-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${meta.className}`}>
                      {meta.symbol} {meta.label}
                    </span>
                  ) : (
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-1" />
                  )}
                  {a && <span className="ml-auto font-mono text-muted-foreground">{a.evalAfter}</span>}
                </div>
                {a && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{a.comment}</p>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
