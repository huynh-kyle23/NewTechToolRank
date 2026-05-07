'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import DataIcon from './data-icon.5c082963.svg';

export default function AppHeader() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const syncState = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (!session?.access_token) {
          setIsAuthenticated(false);
          setIsAdmin(false);
          return;
        }

        setIsAuthenticated(true);
        const res = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        const payload = (await res.json()) as { isAdmin?: boolean };
        setIsAdmin(Boolean(payload.isAdmin));
      } catch {
        setIsAuthenticated(false);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    syncState();
    const { data: listener } = supabase.auth.onAuthStateChange(async () => {
      await syncState();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleHeaderGoogleSignIn() {
    const supabase = getSupabaseBrowserClient();
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: origin }
    });
  }

  async function handleHeaderSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setIsAdmin(false);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-white/15 bg-[#3554a8]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-white">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-white/20">
            <img src={DataIcon.src} alt="Data icon" className="h-7 w-7 object-contain" />
          </span>
          <span className="text-sm font-semibold tracking-wide">New Tools Radar</span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/suggestions"
            className="rounded-full bg-white px-5 py-2 text-xs font-semibold tracking-wide text-[#2f4f9e] transition hover:bg-white/90"
          >
            SUBMIT YOUR OWN SUGGESTION
          </Link>
          {!isAuthenticated ? (
            <button
              type="button"
              onClick={handleHeaderGoogleSignIn}
              className="ml-2 rounded-full border border-white/70 px-5 py-2 text-xs font-semibold tracking-wide text-white transition hover:bg-white/10"
            >
              SIGN IN WITH GOOGLE
            </button>
          ) : null}
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleHeaderSignOut}
              className="ml-2 rounded-full border border-white/70 px-5 py-2 text-xs font-semibold tracking-wide text-white transition hover:bg-white/10"
            >
              LOG OUT
            </button>
          ) : null}
          {isAuthenticated && isAdmin ? (
            <Link
              href="/admin/responses"
              className="ml-2 rounded-full bg-[#dcebff] px-5 py-2 text-xs font-semibold tracking-wide text-[#2f4f9e] transition hover:bg-[#cfe3ff]"
            >
              GO TO ADMIN RESPONSES
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
