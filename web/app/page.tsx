'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import AppHeader from '@/components/AppHeader';
import HeroSection from '@/components/HeroSection';
import ToolCharts from '@/components/ToolCharts';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ToolFilters, ToolRecord } from '@/lib/types';

type ApiResponse = {
  rows: ToolRecord[];
  options: {
    sources: string[];
    categories: string[];
    momenta: string[];
  };
  error?: string;
};

const defaultFilters: ToolFilters = {
  dataOnly: true,
  sources: [],
  categories: [],
  momenta: [],
  lookbackDays: 30,
  limit: 80
};

function toQuery(filters: ToolFilters) {
  const q = new URLSearchParams();
  q.set('dataOnly', String(filters.dataOnly));
  if (filters.sources.length) q.set('sources', filters.sources.join(','));
  if (filters.categories.length) q.set('categories', filters.categories.join(','));
  if (filters.momenta.length) q.set('momenta', filters.momenta.join(','));
  q.set('lookbackDays', String(filters.lookbackDays));
  q.set('limit', String(filters.limit));
  return q.toString();
}

export default function Page() {
  const [filters, setFilters] = useState<ToolFilters>(defaultFilters);
  const [rows, setRows] = useState<ToolRecord[]>([]);
  const [options, setOptions] = useState<ApiResponse['options']>({
    sources: [],
    categories: [],
    momenta: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/tools?${toQuery(filters)}`);
      const payload = (await res.json()) as ApiResponse;
      if (!res.ok) {
        setError(payload.error ?? 'Failed to fetch data');
        setRows([]);
        setLoading(false);
        return;
      }
      setRows(payload.rows ?? []);
      setOptions(payload.options);
      setLoading(false);
    };

    run().catch((err) => {
      setError(String(err));
      setLoading(false);
    });
  }, [filters]);

  const avgScore = useMemo(() => {
    if (!rows.length) return '—';
    return (rows.reduce((sum, r) => sum + (r.score ?? 0), 0) / rows.length).toFixed(1);
  }, [rows]);

  const latestPull = useMemo(() => {
    if (!rows.length) return '—';
    return rows[0]?.data_pulled_date ?? '—';
  }, [rows]);

  return (
    <>
      <AppHeader />
      <main className="container mx-auto max-w-6xl space-y-6 py-8">
        <HeroSection
          title="About Data Tools Radar"
          subtitle="Track upcoming data tools across Product Hunt, Hacker News, and GitHub, then explore momentum and categories in one place."
        >

        </HeroSection>

      {error ? (
        <Card className="mt-4 border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
          <strong>API error:</strong> {error}
          <p className="mb-0 mt-2 text-sm text-muted-foreground">
            Ensure `NEXT_PUBLIC_SUPABASE_URL` and
            `SUPABASE_SERVICE_ROLE_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) are set in
            `web/.env.local`.
          </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-2 border-[#b9d5ff] bg-[#eaf4ff]/95 text-[#2f2f2f] shadow-[0_4px_0_0_#cfe4ff] backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base text-[#243657]">Filters</CardTitle>
          <CardDescription className="text-[#3f557a]">Adjust scope, recency, and row limits.</CardDescription>
        </CardHeader>
        <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-1.5">
            <Label className="text-[#30476e]">
            Data tools only
            </Label>
            <select
              className="flex h-10 w-full rounded-md border border-[#bdd8ff] bg-[#f5faff] px-3 py-2 text-sm text-[#2f4668]"
              value={filters.dataOnly ? 'yes' : 'no'}
              onChange={(e) => setFilters((f) => ({ ...f, dataOnly: e.target.value === 'yes' }))}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-[#30476e]">
            Sources (comma-separated)
            </Label>
            <Input className="border-[#bdd8ff] bg-[#f5faff] text-[#2f4668]"
              value={filters.sources.join(',')}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  sources: e.target.value
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean)
                }))
              }
              placeholder={options.sources.join(', ') || 'product_hunt,hackernews,github'}
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-[#30476e]">
            Categories (comma-separated)
            </Label>
            <Input className="border-[#bdd8ff] bg-[#f5faff] text-[#2f4668]"
              value={filters.categories.join(',')}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  categories: e.target.value
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean)
                }))
              }
              placeholder={options.categories.join(', ') || 'ai,machine_learning,dbms'}
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-[#30476e]">
            Momentum (comma-separated)
            </Label>
            <Input className="border-[#bdd8ff] bg-[#f5faff] text-[#2f4668]"
              value={filters.momenta.join(',')}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  momenta: e.target.value
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean)
                }))
              }
              placeholder={options.momenta.join(', ') || 'hot,rising,new'}
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-[#30476e]">
            Lookback days
            </Label>
            <Input className="border-[#bdd8ff] bg-[#f5faff] text-[#2f4668]"
              type="number"
              min={0}
              max={90}
              value={filters.lookbackDays}
              onChange={(e) => setFilters((f) => ({ ...f, lookbackDays: Number(e.target.value || 0) }))}
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-[#30476e]">
            Max rows
            </Label>
            <Input className="border-[#bdd8ff] bg-[#f5faff] text-[#2f4668]"
              type="number"
              min={10}
              max={500}
              value={filters.limit}
              onChange={(e) => setFilters((f) => ({ ...f, limit: Number(e.target.value || 10) }))}
            />
          </div>
        </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Rows shown', value: loading ? '…' : String(rows.length) },
          { label: 'Unique sources', value: loading ? '…' : String(new Set(rows.map((r) => r.source)).size) },
          { label: 'Average score', value: loading ? '…' : avgScore },
          { label: 'Latest pull date', value: loading ? '…' : latestPull }
        ].map((metric) => (
          <Card
            key={metric.label}
            className="border-2 border-[#b9d5ff] bg-[#edf6ff] text-[#2f2f2f] shadow-[0_4px_0_0_#cfe4ff]"
          >
            <CardHeader className="pb-2">
              <CardDescription className="text-[#4a6289]">{metric.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#2b4f7c]">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <ToolCharts rows={rows} />

      <Card className="mt-4 border-2 border-[#b9d5ff] bg-[#edf6ff] text-[#2f2f2f] shadow-[0_4px_0_0_#cfe4ff]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#2b4f7c]">How score is calculated</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-[#3f557a]">
          <p>
            Score is source-native and not normalized across sources.
          </p>
          <ul className="list-disc pl-5">
            <li>Product Hunt: <code>votesCount</code></li>
            <li>Hacker News: <code>score</code></li>
            <li>GitHub: <code>stargazers_count</code></li>
          </ul>
          <p>
            The <strong>Average score</strong> card is computed from the currently filtered rows shown on this page.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-3 border-2 border-[#b9d5ff] bg-[#edf6ff] text-[#2f2f2f] shadow-[0_4px_0_0_#cfe4ff]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#2b4f7c]">How momentum is calculated</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-[#3f557a]">
          <p>
            Momentum labels are assigned from score thresholds:
          </p>
          <ul className="list-disc pl-5">
            <li>
              <code>hot</code>: score &gt;= 500
            </li>
            <li>
              <code>rising</code>: score &gt;= 100 and &lt; 500
            </li>
            <li>
              <code>new</code>: score &lt; 100
            </li>
          </ul>
          <p>
            This rule is applied uniformly across all sources and categories.
          </p>
        </CardContent>
      </Card>

      <section>
        <h2 className="text-xl font-semibold">Tool previews</h2>
        <div className="mt-3 grid gap-4">
          {rows.map((row) => (
            <Card
              key={`${row.source}-${row.tool_id}`}
              className="rounded-[2rem] border-2 border-[#eadc93] bg-[#f8efc2] text-[#272727] shadow-[0_5px_0_0_#f3e4a6]"
            >
              <CardHeader className="space-y-3 pb-2">
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-[#f9efc8] text-[#2f2f2f]">{row.source}</Badge>
                  <Badge className="border-[#e2cd7b] bg-[#f8edbf] text-[#3a3a3a]" variant="outline">
                    {row.momentum_label}
                  </Badge>
                  <Badge className="border-[#e2cd7b] bg-[#f8edbf] text-[#3a3a3a]" variant="outline">
                    {row.tool_domain}
                  </Badge>
                  {row.data_practice_category ? (
                    <Badge className="bg-[#f4e6ac] text-[#363636]" variant="muted">
                      {row.data_practice_category}
                    </Badge>
                  ) : null}
                </div>
                <CardTitle className="text-center text-2xl font-semibold text-[#2a2a2a]">{row.tool_name}</CardTitle>
                <CardDescription className="text-center text-sm leading-6 text-[#3f3f3f]">
                  {(row.description || 'No description').slice(0, 300)}
                  {(row.description || '').length > 300 ? '…' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-[#4a4a4a]">
                  Score: {row.score} · Pulled: {row.data_pulled_date}
                </span>
                {row.url ? (
                  <a
                    className={buttonVariants({ variant: 'default' }) + ' bg-[#3554a8] text-white hover:bg-[#2a458d]'}
                    href={row.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                ) : (
                  <Button className="bg-[#f3e7b4] text-[#535353]" variant="secondary" disabled>
                    No Link
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {!loading && rows.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                No tools match current filters.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>
    </main>
    </>
  );
}
