'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import {
  linkGitHubManualSchema,
  updateProfileSchema,
} from '../types/profile.types';

export interface ProfileActionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Initiates GitHub OAuth identity linking from the server.
 * Reads the authenticated session from httpOnly cookies and requests
 * the OAuth authorization URL from Supabase with a valid Bearer token.
 */
export async function getGitHubOAuthLinkUrlAction(
  origin?: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: 'Sesi pengguna tidak valid. Silakan login kembali.',
      };
    }

    const baseOrigin =
      origin || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'github',
      options: {
        redirectTo: `${baseOrigin}/auth/callback?next=/settings`,
        scopes: 'read:user user:email',
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.url) {
      return { success: true, url: data.url };
    }

    return {
      success: false,
      error: 'Tidak mendapatkan URL otorisasi dari GitHub',
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Gagal memulai otorisasi GitHub',
    };
  }
}

/**
 * Unlink GitHub account from the user's profile.
 * Clears github_username and deletes github_integrations row.
 */
export async function unlinkGitHubAction(): Promise<ProfileActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: 'Sesi pengguna tidak valid. Silakan login kembali.',
      };
    }

    const identity = user.identities?.find((i) => i.provider === 'github');
    if (identity) {
      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) {
        return {
          success: false,
          error:
            error.code === 'single_identity_not_deletable'
              ? 'GitHub adalah satu-satunya metode masuk. Tautkan metode masuk lain terlebih dahulu.'
              : 'Pelepasan identitas GitHub belum berhasil. Coba lagi.',
        };
      }
    }

    const { error } = await createAdminClient().rpc('clear_github_connection', {
      p_user_id: user.id,
    });
    if (error) {
      revalidatePath('/settings');
      return {
        success: false,
        error:
          'Penghapusan tautan Workhub belum selesai. Coba putuskan tautan lagi.',
      };
    }

    revalidatePath('/settings');
    revalidatePath('/team');
    revalidatePath('/tasks');

    return { success: true };
  } catch {
    return {
      success: false,
      error: 'Status pelepasan GitHub belum dapat dikonfirmasi. Coba lagi.',
    };
  }
}

/**
 * Manually connect or update GitHub username on profile.
 * Serves as direct link & fallback mechanism.
 */
export async function linkGitHubManualAction(
  formData: FormData
): Promise<ProfileActionResult> {
  try {
    const rawUsername = formData.get('username');
    const parsed = linkGitHubManualSchema.safeParse({ username: rawUsername });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Username GitHub tidak valid',
      };
    }

    const cleanUsername = parsed.data.username.trim();

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: 'Sesi pengguna tidak valid. Silakan login kembali.',
      };
    }

    const { error } = await createAdminClient().rpc('save_github_connection', {
      p_user_id: user.id,
      p_username: cleanUsername,
    });
    if (error)
      return {
        success: false,
        error:
          'Username belum tersimpan. Jika GitHub sudah terhubung, putuskan tautannya dahulu.',
      };

    revalidatePath('/settings');
    revalidatePath('/team');
    revalidatePath('/tasks');

    return { success: true, data: { username: cleanUsername } };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'Gagal menautkan akun GitHub secara manual',
    };
  }
}

/**
 * Update personal profile information.
 */
export async function updateProfileAction(
  formData: FormData
): Promise<ProfileActionResult> {
  try {
    const rawData = {
      fullName: formData.get('fullName'),
      position: formData.get('position'),
      phone: formData.get('phone'),
    };

    const parsed = updateProfileSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Data profil tidak valid',
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Sesi pengguna tidak valid.' };
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: parsed.data.fullName,
        position: parsed.data.position || null,
        phone: parsed.data.phone || null,
      })
      .eq('id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/settings');
    revalidatePath('/team');

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal memperbarui profil',
    };
  }
}
