import { NextRequest, NextResponse } from 'next/server';

import { getUserFromAuthorizationHeader } from '@/lib/auth-server';
import { isAdminEmail } from '@/lib/admin';
import { getSupabaseAdminClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const user = await getUserFromAuthorizationHeader(req);
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('tool_suggestions')
    .select(
      'suggestion_id,submitted_at,submitter_name,submitter_email,suggested_tool_name,suggested_tool_url,suggested_category,suggested_description,status,source'
    )
    .order('submitted_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rows: data ?? [] }, { status: 200 });
}
