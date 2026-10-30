export const dynamic = 'force-dynamic';
import { signIn } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body ?? {};
    if (!email || !password) {
      return NextResponse.json({ error: 'Email/username and password are required' }, { status: 400 });
    }
    // signIn via auth.ts CredentialsProvider
    // This is used by next-auth internally; the client should use signIn() from next-auth/react
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Login failed' }, { status: 401 });
  }
}
