'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';

import AppHeader from '@/components/AppHeader';
import HeroSection from '@/components/HeroSection';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type FormState = {
  suggestedToolName: string;
  suggestedToolUrl: string;
  suggestedCategory: string;
  suggestedDescription: string;
};

const initialForm: FormState = {
  suggestedToolName: '',
  suggestedToolUrl: '',
  suggestedCategory: '',
  suggestedDescription: ''
};

export default function SuggestionsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'ok' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoadingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoadingSession(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    if (!session?.access_token) {
      setStatus({ type: 'error', message: 'Please sign in before submitting.' });
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(form)
      });

      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        setStatus({ type: 'error', message: payload.error ?? 'Failed to submit suggestion.' });
        setSubmitting(false);
        return;
      }

      setStatus({ type: 'ok', message: 'Thanks! Your suggestion was submitted for review.' });
      setForm(initialForm);
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Unexpected error' });
    } finally {
      setSubmitting(false);
    }
  }

  const signedInName =
    (session?.user.user_metadata?.full_name as string | undefined) ||
    (session?.user.user_metadata?.name as string | undefined) ||
    session?.user.email;

  return (
    <>
      <AppHeader />
      <main className="container mx-auto max-w-3xl space-y-6 py-8">
        <HeroSection
          title="Submit a Tool Suggestion"
          subtitle="Know an upcoming tool we should track? Sign in, submit, and we will save it to the suggestions pipeline for review."
        >
          <Link
            href="/"
            className="inline-flex items-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-[#27408f] shadow transition hover:bg-white/90"
          >
            Back to Dashboard
          </Link>
        </HeroSection>

      <Card className="border-2 border-[#b9d5ff] bg-[#eaf4ff]/95 text-[#2f2f2f] shadow-[0_4px_0_0_#cfe4ff] backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base text-[#243657]">Suggestion form</CardTitle>
          <CardDescription className="text-[#3f557a]">
            {loadingSession
              ? 'Checking login status...'
              : session
                ? `Signed in as ${signedInName ?? 'authenticated user'}.`
                : 'Sign in with Google to unlock submissions.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-1.5">
              <Label className="text-[#30476e]" htmlFor="suggestedToolName">Tool name *</Label>
              <Input
                className="border-[#bdd8ff] bg-[#f5faff] text-[#2f4668]"
                id="suggestedToolName"
                required
                value={form.suggestedToolName}
                onChange={(e) => setForm((f) => ({ ...f, suggestedToolName: e.target.value }))}
                placeholder="Example: DuckDB Cloud"
              />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-[#30476e]" htmlFor="suggestedToolUrl">Tool URL</Label>
              <Input
                className="border-[#bdd8ff] bg-[#f5faff] text-[#2f4668]"
                id="suggestedToolUrl"
                value={form.suggestedToolUrl}
                onChange={(e) => setForm((f) => ({ ...f, suggestedToolUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-[#30476e]" htmlFor="suggestedCategory">Category</Label>
              <Input
                className="border-[#bdd8ff] bg-[#f5faff] text-[#2f4668]"
                id="suggestedCategory"
                value={form.suggestedCategory}
                onChange={(e) => setForm((f) => ({ ...f, suggestedCategory: e.target.value }))}
                placeholder="ai, machine_learning, dbms, ..."
              />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-[#30476e]" htmlFor="suggestedDescription">Why should we track it?</Label>
              <Textarea
                className="border-[#bdd8ff] bg-[#f5faff] text-[#2f4668]"
                id="suggestedDescription"
                value={form.suggestedDescription}
                onChange={(e) => setForm((f) => ({ ...f, suggestedDescription: e.target.value }))}
                placeholder="Brief summary of what makes this tool noteworthy."
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                className="bg-[#4f84db] text-white hover:bg-[#3f73c9]"
                type="submit"
                disabled={submitting || !session}
              >
                {submitting ? 'Submitting...' : 'Submit suggestion'}
              </Button>
              {status ? (
                <span className={status.type === 'ok' ? 'text-sm text-emerald-400' : 'text-sm text-red-400'}>
                  {status.message}
                </span>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
    </>
  );
}
