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

## Manual – Game upload (Checkers sample)

1. After `yarn prisma db seed`, the home page lists *Checkers* and `/games/checkers` loads the board in the iframe.
2. Keep the home page open in one tab; in another, upload `samples/checkers.zip` from `/admin` with slug `checkers-2` → the new card appears on the home page within ~10 s without reloading.
3. Vs computer: a capture is forced when available; multi-jumps continue; the computer replies as black.
4. Reach the far row → piece is crowned and moves backwards.
5. Undo restores the previous position; refresh resumes the game; New game resets.
6. Switch mode to *Second player* → both colours are moved by hand.
