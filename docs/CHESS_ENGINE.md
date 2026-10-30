# Chess vs Computer – Engine & Commentary

Everything in this document runs **in the browser**; no server calls are made for computer games.

## Modules (`nextjs_space/lib/chess-engine/`)

| File | Purpose |
|---|---|
| `board.ts` | Fast 0x88 board representation, legal move generation, make/unmake, attack detection, Zobrist hashing. |
| `engine.ts` | Evaluation (material + piece-square tables, tapered middlegame/endgame king tables, bishop pair), negamax alpha-beta search with iterative deepening, quiescence search, hash-move table, move ordering (hash move, MVV-LVA, killers, history heuristic), null-move pruning, check extensions, time limit. Exposes `findBestMove(sans, level)`, `suggestMove(sans)`, `search()`, `formatScore()`, `LEVELS`, `LEVEL_LABELS`. |
| `openings.ts` | 128 named ECO opening lines; `detectOpening(sans)` returns the longest matching line, `openingCompletedBy(sans)` reports the line a move completes, `isBookPosition(sans)` flags positions still in theory. |
| `commentary.ts` | `analyzeMove(sans, ply)` – searches the position before the move, compares the played move with the best move and produces a grade, centipawn loss, evaluation and a text comment. |
| `engine.worker.ts` | Web Worker entry: handles `bestMove`, `suggest`, `analyze` messages. |
| `use-chess-engine.ts` | React hook. Spawns two workers (one for play/suggest, one for background analysis) so the UI never freezes; falls back to the main thread if workers are unavailable. |

chess.js is used for rules/SAN parsing at the boundaries; the search uses its own board for speed.

## Difficulty levels

| Level | Label | Max depth | Quiescence | Eval noise (cp) | Random-move chance | Time cap |
|---|---|---|---|---|---|---|
| 1 | Beginner | 1 | no | 350 | 35 % | 0.6 s |
| 2 | Novice | 1 | yes | 220 | 20 % | 0.6 s |
| 3 | Casual | 2 | yes | 140 | 10 % | 0.8 s |
| 4 | Club | 2 | yes | 80 | 4 % | 1.0 s |
| 5 | Intermediate | 3 | yes | 45 | 0 | 1.2 s |
| 6 | Advanced | 4 | yes | 20 | 0 | 1.5 s |
| 7 | Expert | 5 | yes | 0 | 0 | 1.5 s |
| 8 | Master | 6 | yes | 0 | 0 | 2.5 s |
| 9 | Grandmaster | 8 | yes | 0 | 0 | 4.0 s |
| 10 | Champion | 12 | yes | 0 | 0 | 6.0 s |

Lower levels deliberately add random noise to move scores and occasionally pick a random legal move so they make human-like mistakes.

## Game page (`/chess/computer`)

- Started from the lobby "New Game → The computer" dialog (`?level=1..10&color=white|black|random`).
- **Undo** removes your most recent move and the computer's reply; press repeatedly to go back further.
- **Suggest** runs a deep search (up to depth 12 / 2.5 s) and shows the best move as an arrow plus its evaluation.
- Level can be changed mid-game; a new game can be started as white or black.
- The game is saved in `localStorage` so a page refresh resumes it (works in guest mode). Computer games are not written to the database.

## Commentary

Each move is analysed with a full-window depth-4 search (≈ 0.6 s) of the position before it; the grade comes from the centipawn loss versus the engine's best move:

| Grade | Loss (centipawns) |
|---|---|
| Book | position is still in a known opening line |
| Best | ≤ 10 |
| Excellent | ≤ 35 |
| Good | ≤ 80 |
| Inaccuracy | ≤ 150 |
| Mistake | ≤ 300 (also: missing a forced mate) |
| Blunder | > 300 |

Comments also describe the move (development, castling, captures, checks, central pawn moves, promotions, early queen/king moves, forced mates, stalemate/repetition), suggest the better move for inaccuracies/mistakes/blunders, and name the opening once reached, e.g. *"This is the Queen's Gambit (D06)."* Annotations are computed in a background worker and cached per move sequence, so undo never recomputes them. The same commentary panel is shown in player-vs-player games for both players' moves.
