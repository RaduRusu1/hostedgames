import { ChessGameClient } from './_components/chess-game-client';

export default async function ChessGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  return <ChessGameClient gameId={gameId} />;
}
