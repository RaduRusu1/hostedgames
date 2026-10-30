# Test Plan

## Automated

- `tsc --noEmit` type check and production build.
- Platform smoke test: dev server boots, all routes return 200, no console errors, login flow works.
- Engine script (`tsx`): level 1/5/10 produce legal moves within the time caps; `suggestMove` returns ranked moves; `analyzeMove` grades `Qxf7#` as *Best/Checkmate* and `...Nf6??` (allowing Qxf7#) as *Blunder*; `detectOpening(['d4','d5','c4'])` returns *D06 Queen's Gambit*.

## Manual – Auth & Admin

1. Sign up, log out, log in with email and with username.
2. Guest can open games but scores are not saved.
3. Admin (`radu`) opens `/admin`, creates a user and an admin; non-admin gets redirected.
4. Admin uploads `demo.zip`; game appears at `/games/demo` and on the home page.

## Manual – Chess vs player

1. User A: Lobby → New Game → *Another player* → game created (waiting).
2. User B joins from the lobby; board orientation is black for B.
3. Moves only allowed on your turn; illegal drops snap back; opponent's board updates within ~3 s.
4. Commentary panel grades each move and shows the opening name.
5. Resign / draw / checkmate end the game; it appears at `/chess/history` with full move list.

## Manual – Chess vs computer

1. Lobby → New Game → *The computer*; pick level 1 and white → computer replies quickly with weak moves.
2. Level 10 as black → computer opens, thinks up to ~6 s, UI stays responsive.
3. Make 3 moves, press **Undo** three times → back to start; Undo disabled when no human moves remain.
4. **Suggest** draws an arrow and shows an evaluation; playing the suggested move is graded *Best*.
5. Play 1.d4 d5 2.c4 → commentary shows *Queen's Gambit*.
6. Refresh the page → game resumes; guest (logged out) can also play.
7. Checkmate / stalemate / resign show the correct result and disable moves.

## Manual – Game upload (Gomoku sample)

1. As admin, upload `samples/gomoku.zip` (slug `gomoku`, or any unused slug) → 201 with 3 files; within ~10 s the home page shows the *Gomoku* card without reloading, and `/games/<slug>` loads the board.
2. Click a point → a black stone appears, the move is graded in Commentary, and the computer replies with White.
3. Suggest → a purple marker shows the suggested point and the hint text explains it.
4. Undo vs computer → both the computer's reply and your move are removed; in two-player mode only one move is removed.
5. Make five in a row → the winning line is highlighted and the status shows the winner; the board is locked until New game.
6. Level 1 should make obvious mistakes (graded Mistake/Blunder); level 10 should block every four and punish open threes.
7. Refresh → the game, level and commentary are restored.

Headless check (used during development): drive `game.js` with a minimal DOM stub in node, playing Suggest vs each level – levels 1, 5 and 10 all finish a game, and Undo returns to Black's turn.

## Manual – Game upload (Chinese Checkers sample)

1. As admin, upload `samples/chinesecheckers.zip` (slug `chinesecheckers`) → 201 with 3 files; the home page shows the card within ~10 s and `/games/chinesecheckers` loads the star board.
2. Click a red marble → reachable holes are marked (steps and multi-jump destinations); click one → the marble moves, the from/to holes and jump path stay highlighted, the move is graded, and the computer replies with Blue.
3. Suggest highlights a move; Undo vs computer returns to Red's turn (one move in two-player mode); refresh restores the game.
4. Fill the top triangle → status shows the winner and the board locks.

Headless check: Suggest vs levels 1, 5 and 10 each finished a game (level 10 turn ≤ 2.5 s); verified by uploading through `/api/admin/games/upload` (201, slug listed in `/api/games`).

## Manual – Game upload (Nine Men's Morris sample)

1. As admin, upload `samples/ninemensmorris.zip` (slug `ninemensmorris`) → 201 with 3 files; card appears on the home page within ~10 s; `/games/ninemensmorris` loads the board.
2. Place pieces → the last placed point is highlighted; forming a mill asks you to click an opponent piece to remove (pieces in mills protected unless all are).
3. After all 9 are placed, click a piece then an adjacent empty point to slide; with 3 pieces any empty point is allowed (flying).
4. Suggest, Undo (back to White's turn vs computer), level 1–10, commentary grading and refresh-restore behave as in the other samples.

Headless check: Suggest vs levels 1 and 10 played full games; Undo verified; uploaded via the admin API (201, slug listed in `/api/games`).

## Manual – Game upload (Checkers sample)

1. After `yarn prisma db seed`, the home page lists *Checkers*, *Gomoku*, *Chinese Checkers* and *Nine Men's Morris*, and `/games/checkers` loads the board in the iframe.
2. Keep the home page open in one tab; in another, upload `samples/checkers.zip` from `/admin` with slug `checkers-2` → the new card appears on the home page within ~10 s without reloading.
3. Vs computer: a capture is forced when available; multi-jumps continue; the computer replies as black.
4. Reach the far row → piece is crowned and moves backwards.
5. Undo restores the previous position (vs computer: back to Red's turn); refresh resumes the game with its commentary; New game resets.
6. Switch mode to *Second player* → both colours are moved by hand and the Level select is hidden.
7. Suggest highlights the from/to squares and explains the move; every move gets a grade, eval (Red's view) and explanation in Commentary.
8. Levels 1–10: level 1 plays loosely; level 10 searches up to 8 plies within ~1.8 s per move.
