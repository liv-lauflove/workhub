'use client';

import { useEffect, useState, useCallback } from 'react';

interface SessionUser {
  id: string;
  email?: string;
  user_metadata: Record<string, unknown>;
}

/**
 * Client-side hook untuk mendapatkan data user yang sedang login.
 *
 * Memanggil endpoint internal `/api/auth/session` alih-alih
 * langsung mengakses Supabase Auth dari browser, sehingga:
 *   - Token JWT tidak pernah terekspos ke client JavaScript
 *   - Validasi sesi dilakukan server-side
 *   - Mengurangi request langsung ke Supabase REST API
 */
export function useUser() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/auth/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) {
          setUser(data?.user ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refetch = useCallback(() => {
    setLoading(true);
    fetch('/api/auth/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setUser(data?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  return { user, loading, refetch };
}
