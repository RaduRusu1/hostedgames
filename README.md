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
  scripts/seed.ts      seed data (admin account)
samples/
  checkers/            sample uploadable game (index.html, style.css, game.js)
  checkers.zip         ready-to-upload zip of the sample
docs/
  PLANNING.md          requirements & design decisions
  IMPLEMENTATION.md    architecture & module notes
  CHESS_ENGINE.md      engine, levels, commentary details
  TEST_PLAN.md         manual + automated test plan
```

## Sample game: Checkers

`samples/checkers` is a plain HTML/JS checkers (English draughts) game – vs the computer or a second player on the same device, with mandatory captures, multi-jumps, kings and Undo. To install it: log in as an admin → **Admin → Upload game** → choose `samples/checkers.zip`, slug `checkers` → play at `/games/checkers`. Uploaded zips must have `index.html` at the root.

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
