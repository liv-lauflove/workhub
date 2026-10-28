import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/session
 *
 * Backend endpoint untuk memeriksa sesi aktif pengguna.
 * Client-side code memanggil endpoint ini alih-alih langsung
 * mengakses Supabase Auth dari browser, sehingga:
 *   1. Token JWT tidak terekspos ke JavaScript browser
 *   2. Validasi sesi dilakukan server-side (supabase.auth.getUser)
 *   3. Mengurangi beban langsung ke Supabase REST API
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Return sanitized user data (tanpa token/secret fields)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
