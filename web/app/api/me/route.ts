import { NextRequest, NextResponse } from 'next/server';

import { getUserFromAuthorizationHeader } from '@/lib/auth-server';
import { isAdminEmail } from '@/lib/admin';

export async function GET(req: NextRequest) {
  const user = await getUserFromAuthorizationHeader(req);
  if (!user) {
    return NextResponse.json({ authenticated: false, isAdmin: false }, { status: 200 });
  }

  return NextResponse.json(
    {
      authenticated: true,
      email: user.email ?? null,
      name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      isAdmin: isAdminEmail(user.email)
    },
    { status: 200 }
  );
}
