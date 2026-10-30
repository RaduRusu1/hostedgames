# Planning & Design Decisions

## Requirements

1. Site hosted at `hostedgames.abacusai.app`.
2. Persist user logins, scores and game state in a hosted database.
3. Anonymous guest play without saving scores.
4. Default admin account `radu` (password set in seed; change it after first login).
5. Admins can add admins and regular users.
6. Admins upload games as zip files; `gameXYZ.zip` → folder `gameXYZ` → playable game.
7. Built-in chess: logged-in users play each other, full history saved, list of games at `/history`.
8. Chess v2: the first player chooses to play **another user** or **the computer**; computer mode is a browser-side TypeScript engine with levels 1–10, **Undo** and **Suggest**, plus per-move commentary evaluating strength and naming openings (e.g. Queen's Gambit).

## Decisions

| Topic | Decision | Reason |
|---|---|---|
| Subdomains | Uploaded games served at `/games/<slug>`; chess at `/chess` and `/chess/history` | The platform serves one hostname per app; wildcard subdomains are not available. |
| Chess sync | Turn-based with 3 s polling (user's choice) | Simple and reliable on serverless hosting. |
| Computer opponent | Custom TypeScript engine in Web Workers | Runs fully in the browser, no server cost, UI stays responsive; works for guests. |
| Computer game storage | Browser `localStorage` | Requirement only asks for history of user-vs-user games; avoids DB writes for guests. |
| Commentary | Engine-based centipawn-loss grading + 128-line ECO opening book | Deterministic, offline, explains both sides' moves. |
| Move UI | react-chessboard v5 wrapper (`components/chess/chess-board.tsx`) with optimistic moves validated by chess.js; server remains authoritative | Snappy drag-and-drop; illegal moves rejected locally and server-side. |
| Game files | Extracted to cloud storage, proxied through `/api/games/serve/...` | No local filesystem in production. |

## Out of scope

- Real-time websockets, clocks/time controls, ratings.
- Saving computer games to the database.
