import { NextRequest, NextResponse } from 'next/server';

import { getUserFromAuthorizationHeader } from '@/lib/auth-server';
import { getSupabaseAdminClient } from '@/lib/supabase';

type SuggestionPayload = {
  suggestedToolName: string;
  suggestedToolUrl?: string;
  suggestedCategory?: string;
  suggestedDescription?: string;
};

function clamp(value: string | undefined, maxLen: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

function isValidHttpUrl(value: string | null): boolean {
  if (!value) return true;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromAuthorizationHeader(req);
    if (!user) {
      return NextResponse.json({ error: 'You must be logged in to submit a suggestion.' }, { status: 401 });
    }

    const body = (await req.json()) as Partial<SuggestionPayload>;

    const suggestedToolName = clamp(body.suggestedToolName, 200);
    if (!suggestedToolName) {
      return NextResponse.json({ error: 'suggestedToolName is required' }, { status: 400 });
    }

    const metadataName =
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      (user.user_metadata?.preferred_username as string | undefined);
    const submitterName = clamp(metadataName, 120);
    const submitterEmail = clamp(user.email, 255);
    const suggestedToolUrl = clamp(body.suggestedToolUrl, 500);
    const suggestedCategory = clamp(body.suggestedCategory, 120);
    const suggestedDescription = clamp(body.suggestedDescription, 2000);

    if (!isValidHttpUrl(suggestedToolUrl)) {
      return NextResponse.json({ error: 'suggestedToolUrl must be a valid http(s) URL' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    const { error } = await supabase.from('tool_suggestions').insert({
      submitter_name: submitterName,
      submitter_email: submitterEmail,
      suggested_tool_name: suggestedToolName,
      suggested_tool_url: suggestedToolUrl,
      suggested_category: suggestedCategory,
      suggested_description: suggestedDescription,
      source: 'web_form'
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
