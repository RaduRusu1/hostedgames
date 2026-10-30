'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Gamepad2, Swords, ArrowRight, Users, Trophy, Globe } from 'lucide-react';
import { useSession } from 'next-auth/react';

type GameCard = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cloudStoragePath: string | null;
};

const GAME_ICONS: Record<string, React.ReactNode> = {
  chess: <Swords className="w-8 h-8" />,
};

export function HomeClient({ games }: { games: GameCard[] }) {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />
        <div className="max-w-[1200px] mx-auto px-4 py-24 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight mb-4">
              Your <span className="text-primary">Games</span>, Hosted
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              Play chess against friends, explore uploaded games, and track your scores — all in one place.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/chess"
                className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all flex items-center gap-2 shadow-md"
              >
                <Swords className="w-5 h-5" /> Play Chess
              </Link>
              {!session && (
                <Link
                  href="/signup"
                  className="px-6 py-3 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-all flex items-center gap-2"
                >
                  <Users className="w-5 h-5" /> Create Account
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Row */}
      <section className="max-w-[1200px] mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <Gamepad2 className="w-6 h-6 text-primary" />, label: 'Games Available', value: String(games?.length ?? 0) },
            { icon: <Trophy className="w-6 h-6 text-amber-400" />, label: 'Competitive', value: 'Chess' },
            { icon: <Globe className="w-6 h-6 text-accent" />, label: 'Access', value: 'Free & Open' },
          ].map((stat: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="bg-card rounded-xl p-6 flex items-center gap-4 shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="p-3 rounded-lg bg-secondary">{stat.icon}</div>
              <div>
                <div className="text-2xl font-bold font-mono">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Games Grid */}
      <section className="max-w-[1200px] mx-auto px-4 py-8 pb-20">
        <h2 className="font-display text-2xl font-bold tracking-tight mb-6">Available Games</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(games ?? []).map((game: GameCard, i: number) => {
            const href = game.slug === 'chess' ? '/chess' : (game.cloudStoragePath ? `/games/${game.slug}` : '#');
            return (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <Link href={href} className="block group">
                  <div className="bg-card rounded-xl p-6 shadow-md hover:shadow-lg transition-all hover:scale-[1.02] border border-border hover:border-primary/40">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {GAME_ICONS[game.slug] ?? <Gamepad2 className="w-8 h-8" />}
                      </div>
                      <h3 className="font-display text-xl font-bold">{game.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{game.description ?? 'No description'}</p>
                    <div className="flex items-center text-primary text-sm font-medium group-hover:gap-2 transition-all">
                      Play Now <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {(!games || games.length === 0) && (
          <div className="text-center py-16 text-muted-foreground">
            <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No games available yet. Check back soon!</p>
          </div>
        )}
      </section>
    </div>
  );
}
