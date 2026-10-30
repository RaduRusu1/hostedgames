'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Gamepad2, Crown, LogOut, LogIn, UserPlus, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = session?.user?.role === 'admin';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-[1200px] mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Gamepad2 className="w-7 h-7 text-primary" />
          <span className="font-display text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
            HostedGames
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link href="/" className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
            Home
          </Link>
          <Link href="/chess" className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
            Chess
          </Link>
          {isAdmin && (
            <Link href="/admin" className="px-3 py-2 rounded-md text-sm font-medium text-amber-400 hover:text-amber-300 hover:bg-secondary transition-all flex items-center gap-1">
              <Crown className="w-4 h-4" />
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {status === 'loading' ? (
            <div className="w-20 h-8 bg-secondary rounded-md animate-pulse" />
          ) : session?.user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-secondary hover:bg-secondary/80 transition-all"
              >
                <span className="text-primary font-mono">{session.user.username ?? session.user.name}</span>
                {isAdmin && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                  <div className="md:hidden">
                    <Link href="/" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary">Home</Link>
                    <Link href="/chess" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary">Chess</Link>
                    {isAdmin && <Link href="/admin" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-amber-400 hover:bg-secondary">Admin</Link>}
                    <div className="border-t border-border my-1" />
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); signOut({ redirectTo: '/' }); }}
                    className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-secondary flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all flex items-center gap-1">
                <LogIn className="w-4 h-4" /> Login
              </Link>
              <Link href="/signup" className="px-3 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-1">
                <UserPlus className="w-4 h-4" /> Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
