import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Clear both HTTP-Only cookies
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');

    // Note: We don't need to hit the backend for logout unless backend maintains a blacklist
    // The Firebase client-side signOut() will happen in the UI component
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[API Proxy Error /logout]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
