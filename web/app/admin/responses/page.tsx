'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import AppHeader from '@/components/AppHeader';
import HeroSection from '@/components/HeroSection';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type SuggestionRow = {
  suggestion_id: number;
  submitted_at: string;
  submitter_name: string | null;
  submitter_email: string | null;
  suggested_tool_name: string;
  suggested_tool_url: string | null;
  suggested_category: string | null;
  suggested_description: string | null;
  status: string;
  source: string;
};

export default function AdminResponsesPage() {
  const [rows, setRows] = useState<SuggestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          setError('Please sign in first.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/admin/suggestions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const payload = (await res.json()) as { rows?: SuggestionRow[]; error?: string };
        if (!res.ok) {
          setError(payload.error ?? 'Failed to load suggestions.');
          setLoading(false);
          return;
        }
        setRows(payload.rows ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unexpected error');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <>
      <AppHeader />
      <main className="container mx-auto max-w-5xl space-y-6 py-8">
        <HeroSection
          title="User Responses (Admin)"
          subtitle="This page is restricted to emails listed in ADMIN_EMAILS."
        >
          <Link
            href="/"
            className="inline-flex items-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-[#27408f] shadow transition hover:bg-white/90"
          >
            Back to Dashboard
          </Link>
        </HeroSection>

        <Card className="border-2 border-[#b9d5ff] bg-[#eaf4ff]/95 shadow-[0_4px_0_0_#cfe4ff]">
          <CardHeader>
            <CardTitle className="text-base text-[#243657]">Submitted suggestions</CardTitle>
            <CardDescription className="text-[#3f557a]">
              Full details from the `tool_suggestions` table.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p className="text-sm text-[#3f557a]">Loading responses...</p> : null}
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            {!loading && !error && rows.length === 0 ? (
              <p className="text-sm text-[#3f557a]">No suggestions submitted yet.</p>
            ) : null}
            {!loading && !error
              ? rows.map((row) => (
                  <div key={row.suggestion_id} className="rounded-lg border border-[#bfd6fb] bg-[#f5faff] p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[#243657]">{row.suggested_tool_name}</h3>
                      <Badge className="bg-[#dcebff] text-[#32548d]">{row.status}</Badge>
                    </div>
                    <p className="text-xs text-[#4a618b]">Submitted: {new Date(row.submitted_at).toLocaleString()}</p>
                    <p className="text-xs text-[#4a618b]">Submitter: {row.submitter_name || 'Unknown'} ({row.submitter_email || 'No email'})</p>
                    <p className="text-xs text-[#4a618b]">Category: {row.suggested_category || 'N/A'}</p>
                    <p className="text-xs text-[#4a618b]">Source: {row.source}</p>
                    {row.suggested_tool_url ? (
                      <p className="text-xs">
                        <a
                          href={row.suggested_tool_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#2f5ca6] underline"
                        >
                          {row.suggested_tool_url}
                        </a>
                      </p>
                    ) : null}
                    {row.suggested_description ? (
                      <p className="mt-2 text-sm text-[#2f4668]">{row.suggested_description}</p>
                    ) : null}
                  </div>
                ))
              : null}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
