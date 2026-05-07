import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@/lib/supabase';
import type { ToolRecord } from '@/lib/types';

function parseCsv(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;

    const dataOnly = params.get('dataOnly') !== 'false';
    const sources = parseCsv(params.get('sources'));
    const categories = parseCsv(params.get('categories'));
    const momenta = parseCsv(params.get('momenta'));
    const lookbackDays = Number(params.get('lookbackDays') ?? '30');
    const limit = Math.min(Math.max(Number(params.get('limit') ?? '80'), 10), 500);

    const supabase = getSupabaseServerClient();

    let query = supabase
      .from('int_tools_clean')
      .select(
        'tool_id,tool_name,source,description,url,score,momentum_label,data_practice_category,tool_domain,data_pulled_at,data_pulled_date,created_at'
      )
      .order('data_pulled_at', { ascending: false })
      .order('score', { ascending: false })
      .limit(limit);

    if (dataOnly) query = query.eq('tool_domain', 'data_tool');
    if (sources.length > 0) query = query.in('source', sources);
    if (categories.length > 0) query = query.in('data_practice_category', categories);
    if (momenta.length > 0) query = query.in('momentum_label', momenta);
    if (lookbackDays > 0) {
      const minDate = new Date();
      minDate.setUTCDate(minDate.getUTCDate() - lookbackDays);
      query = query.gte('data_pulled_date', minDate.toISOString().slice(0, 10));
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []) as ToolRecord[];

    const sourceOptions = [...new Set(rows.map((r) => r.source).filter(Boolean))].sort();
    const categoryOptions = [
      ...new Set(rows.map((r) => r.data_practice_category).filter((v): v is string => Boolean(v)))
    ].sort();
    const momentumOptions = [...new Set(rows.map((r) => r.momentum_label).filter(Boolean))].sort();

    return NextResponse.json({
      rows,
      options: {
        sources: sourceOptions,
        categories: categoryOptions,
        momenta: momentumOptions
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
