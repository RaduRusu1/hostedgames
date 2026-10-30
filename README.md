# HostedGames

A game hosting platform running at **https://hostedgames.abacusai.app**.

## Features

- **Accounts** – sign up / log in with email or username. Roles: `guest` (anonymous, scores not saved), `user`, `admin`.
- **Admin dashboard** (`/admin`) – admins create regular users and other admins, and upload games as `.zip` files.
- **Game uploads** – `gameXYZ.zip` is extracted into cloud storage under `public/games/gameXYZ/` and served at `/games/gameXYZ`.
- **Persistence** – users, scores, per-user game state and chess games are stored in the hosted database.
- **Chess** (`/chess`)
  - **Play another user** – turn-based, 3 s polling, full move/FEN/PGN history saved; completed games listed at `/chess/history`.
  - **Play the computer** (`/chess/computer`) – a TypeScript engine running in the browser (Web Worker), difficulty levels **1 (easy) – 10 (hard)**, **Undo** (repeatable, takes back one or more moves) and **Suggest** (best-move hint with arrow).
  - **Move commentary** – every move by both sides is graded (Best / Excellent / Good / Book / Inaccuracy / Mistake / Blunder) with an evaluation and a short explanation; openings are named from a 128-line ECO book (e.g. "D06 · Queen's Gambit"). Available in both computer and player-vs-player games.

## Repository layout

```
nextjs_space/
  app/                 pages + API routes (chess, admin, games, auth)
  components/chess/    board wrapper, commentary panel, annotation hook
  lib/chess-engine/    in-browser chess engine, opening book, commentary, worker
  prisma/schema.prisma database schema
  scripts/seed.ts      seed data (admin account, chess entry, sample games)
  scripts/sample-games.ts installs samples/* into cloud storage + games table
samples/
  checkers/            sample uploadable game (index.html, style.css, game.js)
  checkers.zip         ready-to-upload zip of the checkers sample
  gomoku/              sample uploadable game (index.html, style.css, game.js)
  gomoku.zip           ready-to-upload zip of the gomoku sample
  chinesecheckers/     sample uploadable game (+ chinesecheckers.zip)
  ninemensmorris/      sample uploadable game (+ ninemensmorris.zip)
docs/
  PLANNING.md          requirements & design decisions
  IMPLEMENTATION.md    architecture & module notes
  CHESS_ENGINE.md      engine, levels, commentary details
  TEST_PLAN.md         manual + automated test plan
```

## Sample games: Checkers, Gomoku, Chinese Checkers, Nine Men's Morris

All four samples are plain HTML/CSS/JS games with the same feature set: play a second player on the same device or the computer at **levels 1–10**, the **last move stays highlighted**, **Undo** (vs the computer it takes back to your last move), **Suggest** (highlights the engine's best move with an explanation) and a **Commentary** panel that grades every move (Best / Excellent / Good / Inaccuracy / Mistake / Blunder / Forced) with an evaluation and a short explanation.

- `samples/checkers` – English draughts: mandatory captures, multi-jumps, kings. Playable at `/games/checkers`.
- `samples/gomoku` – five in a row on a 15×15 board (Black moves first, five or more wins). Playable at `/games/gomoku`.
- `samples/chinesecheckers` – two-player Chinese Checkers on the 121-hole star: step to a neighbouring hole or chain jumps over any marble; first to fill the opposite triangle wins. Playable at `/games/chinesecheckers`.
- `samples/ninemensmorris` – Nine Men's Morris: place 9 pieces each, then slide (fly when down to 3); forming a mill removes an opponent piece; reduce the opponent to 2 pieces or leave them without a move to win. Playable at `/games/ninemensmorris`.

They are installed automatically by the seed (`yarn prisma db seed` runs `scripts/sample-games.ts`, which uploads `samples/<game>/*` to cloud storage and upserts the matching row in `games`). You can also upload them manually: **Admin → Upload game** → `samples/<game>.zip` with any unused slug. Uploaded zips must have `index.html` at the root.

The home page lists every game in the `games` table and refreshes the list every 10 s (and when the tab regains focus), so newly uploaded games appear without reloading.

## Running locally

```bash
cd nextjs_space
yarn install
cp .env.example .env   # set DATABASE_URL, AUTH_SECRET, storage settings
yarn prisma db push
SEED_ADMIN_PASSWORD=... yarn prisma db seed   # creates admin user `radu`
yarn dev
```

Secrets are **not** committed; fill in your own values in `.env`.
