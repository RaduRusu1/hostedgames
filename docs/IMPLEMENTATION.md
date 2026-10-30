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

## Sample uploadable game – Checkers

`samples/checkers/` is a self-contained HTML/CSS/JS English draughts game used to exercise the upload pipeline (it is not part of the deployed app bundle).

- `index.html`, `style.css`, `game.js` sit at the **zip root** – the upload route extracts entries to `public/games/<slug>/<entry>` and the player iframe loads `/api/games/serve/<slug>/index.html`, so a nested folder would break the entry path.
- All asset paths are relative, so the game works under `/api/games/serve/<slug>/`.
- Rules: mandatory captures, multi-jump chains, crowning to kings. Modes: vs computer (black, 4-ply alpha-beta minimax) or two players on one device. Undo + New game; state kept in `localStorage` (`hostedgames-checkers`).
- `samples/checkers.zip` is the ready-to-upload archive (rebuild with `cd samples/checkers && zip -r ../checkers.zip .`).

Installation: `scripts/sample-games.ts` (`installSampleGames`) is called from `scripts/seed.ts`. It reads `../samples/<dir>`, uploads every file to `public/games/<slug>/…` and upserts the `games` row (`cloudStoragePath` set), so re-running the seed is idempotent. No schema change was needed.

## Home page game list

`app/page.tsx` is rendered dynamically from the `games` table; `HomeClient` then re-fetches `GET /api/games` (`Cache-Control: no-store`) every 10 s and on window focus / tab visibility, so a game uploaded from `/admin` shows up on open home pages within seconds.
