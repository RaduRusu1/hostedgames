# Implementation Notes

## Stack

React server/client components, Prisma ORM on the hosted database, Auth.js v5 (credentials, JWT sessions), Tailwind + framer-motion UI, chess.js + react-chessboard, AWS S3-compatible cloud storage.

## Database (`nextjs_space/prisma/schema.prisma`)

| Table | Purpose |
|---|---|
| `users` | email, username, bcrypt password hash, role (`user`/`admin`) |
| `scores` | user × game scores |
| `game_states` | per-user JSON save state per game |
| `games` | uploaded games (name, slug, cloud storage path, uploader) |
| `chess_games` | white/black players, status (`waiting`/`active`/`completed`/`draw`/`resigned`), winner, current FEN, PGN, FEN history, move history (`{from,to,promotion,san}`) |

Seed: `nextjs_space/scripts/seed.ts` (upserts the admin account; never deletes data).

## Routes

| Path | Description |
|---|---|
| `/` | Home, list of games |
| `/login`, `/signup` | Auth |
| `/admin` | Admin dashboard (server-side role check) |
| `/games/[slug]` | Uploaded game in an iframe |
| `/chess` | Lobby + **New Game** dialog (another player / the computer with level & colour) |
| `/chess/[gameId]` | Player-vs-player board, polling, move list, commentary |
| `/chess/computer` | Player-vs-computer board, levels, Undo, Suggest, commentary |
| `/chess/history` | Completed player-vs-player games |

API: `/api/chess/{create,join,list,poll,move,resign,draw,history}`, `/api/admin/{users,games}`, `/api/games`, `/api/games/serve/[...path]`, `/api/signup`, `/api/auth/*`.

## Chess components

- `components/chess/chess-board.tsx` – typed wrapper around react-chessboard v5 (`options` API), last-move highlight, arrows, auto-queen promotion helper.
- `components/chess/commentary-panel.tsx` – opening banner + graded move list.
- `components/chess/use-move-annotations.ts` – background, cached annotation of every move.
- `lib/chess-engine/*` – see [CHESS_ENGINE.md](CHESS_ENGINE.md).

## Player-vs-player move flow

1. Drop → validated locally with chess.js against the current FEN; illegal moves snap back.
2. Board updates optimistically; `POST /api/chess/move` validates again server-side, checks turn/ownership, appends to histories and detects mate/draw.
3. On error a toast is shown and the board resyncs from `/api/chess/poll`.

## Sample uploadable games – Checkers and Gomoku

`samples/checkers/` (English draughts) and `samples/gomoku/` (five in a row) are self-contained HTML/CSS/JS games used to exercise the upload pipeline (they are not part of the deployed app bundle). Both share the same panel layout and CSS classes (`.layout`, `.panel`, `#mode`, `#level`, `#undo`, `#suggest`, `#restart`, `#status`, `#hint`, `ol#notes`) and the same quality labels (`.q-best` … `.q-blunder`).

Common features:
- Opponent: computer or a second player on the same device. Level 1–10 select (shown only vs the computer).
- Undo: pops one move (two-player) or back to the human's turn (vs computer). Commentary entries are popped in step.
- Suggest: deeper search for the side to move; highlights the move and explains it in `#hint`.
- Commentary: before each move is applied, every candidate is scored; loss = best score − played score, graded Best / Excellent / Good / Inaccuracy / Mistake / Blunder (Forced when there was only one legal/sensible move; Blunder when a forced win is missed or a forced loss is walked into). Each entry shows the move, grade, eval and an explanation (captures/crowns for checkers; makes four, open four, four-three, blocks four/three for gomoku), plus the better move when the grade is Good or worse.

Checkers engine: minimax with alpha-beta (multi-jump steps do not consume depth), material + advancement + centre evaluation. Levels map to 1–8 plies with random noise for levels 1–6; iterative deepening with a time budget (300 ms + 150 ms × level) keeps endgames responsive. Eval is shown from Red's point of view (100 = one man). State, history and notes saved in `localStorage` (`hostedgames-checkers`).

Gomoku engine: every 5-cell window is pre-computed; per-window stone counts and a static evaluation are updated incrementally on place/unplace (window with k stones of one colour only = 2/20/200/2500). Negamax with alpha-beta over candidate points within distance 2 of a stone, ordered by an attack + defence heuristic; immediate wins are taken and opponent fours force a block. Levels vary depth (1–6), width (8–14), noise and a random-move chance for levels 1–2; iterative deepening with a time limit (up to ~2.2 s at level 10). Moves and notes saved in `localStorage` (`hostedgames-gomoku`).

Packaging notes:

- `index.html`, `style.css`, `game.js` sit at the **zip root** – the upload route extracts entries to `public/games/<slug>/<entry>` and the player iframe loads `/api/games/serve/<slug>/index.html`, so a nested folder would break the entry path.
- All asset paths are relative, so the game works under `/api/games/serve/<slug>/`.
- `index.html` references `style.css?v=N` / `game.js?v=N`; bump N whenever a sample changes, because served assets are cached for an hour. HTML entry pages are served with `Cache-Control: no-cache` and the player iframe adds a per-visit `?v=` to `index.html`, so re-uploads show immediately.
- `samples/checkers.zip` / `samples/gomoku.zip` are the ready-to-upload archives (rebuild with `cd samples/<game> && zip -r ../<game>.zip .`).

Installation: `scripts/sample-games.ts` (`installSampleGames`) is called from `scripts/seed.ts`. It reads `../samples/<dir>`, uploads every file to `public/games/<slug>/…` and upserts the `games` row (`cloudStoragePath` and `description` refreshed), so re-running the seed is idempotent. `SAMPLE_GAMES` lists `checkers` and `gomoku`. No schema change was needed.

## Home page game list

`app/page.tsx` is rendered dynamically from the `games` table; `HomeClient` then re-fetches `GET /api/games` (`Cache-Control: no-store`) every 10 s and on window focus / tab visibility, so a game uploaded from `/admin` shows up on open home pages within seconds.
