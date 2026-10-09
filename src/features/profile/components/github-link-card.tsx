'use client';

import * as React from 'react';
import { useState, useTransition, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  unlinkGitHubAction,
  linkGitHubManualAction,
  getGitHubOAuthLinkUrlAction,
} from '../actions/profile.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  ExternalLink,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Loader2,
  Unlink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

interface GitHubLinkCardProps {
  initialGitHubUsername?: string | null;
  initialConnectedAt?: string | null;
  userEmail?: string;
}

export function GitHubLinkCard({
  initialGitHubUsername,
  initialConnectedAt,
}: GitHubLinkCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [githubUsername, setGithubUsername] = useState<string | null>(
    initialGitHubUsername || null
  );
  const [isLinkingOAuth, setIsLinkingOAuth] = useState(false);
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualUsernameInput, setManualUsernameInput] = useState('');
  const [isPending, startTransition] = useTransition();

  // Check URL query parameters for OAuth redirect feedback
  useEffect(() => {
    if (searchParams.get('github_linked') === 'true') {
      toast.success('Akun GitHub berhasil terhubung ke profil Anda!');
      router.replace('/settings');
    } else if (searchParams.get('error') === 'oauth_failed') {
      toast.error('Gagal menghubungkan akun GitHub. Silakan coba lagi.');
      router.replace('/settings');
    }
  }, [searchParams, router]);

  const isConnected = Boolean(githubUsername);

  // 1. Primary Action: Initiate Supabase OAuth Identity Linking via Server Action
  const handleLinkGitHubOAuth = async () => {
    try {
      setIsLinkingOAuth(true);
      const res = await getGitHubOAuthLinkUrlAction(window.location.origin);

      if (!res.success || !res.url) {
        toast.error(res.error || 'Gagal memulai otorisasi GitHub.');
        setIsLinkingOAuth(false);
        return;
      }

      window.location.assign(res.url);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat menghubungi GitHub'
      );
      setIsLinkingOAuth(false);
    }
  };

  // 2. Action: Unlink GitHub Account
  const handleUnlinkGitHub = () => {
    startTransition(async () => {
      const res = await unlinkGitHubAction();
      if (res.success) {
        setGithubUsername(null);
        setShowUnlinkDialog(false);
        toast.success('Tautan akun GitHub berhasil diputuskan.');
        router.refresh();
      } else {
        toast.error(res.error || 'Gagal memutuskan tautan akun GitHub.');
      }
    });
  };

  // 3. Fallback Action: Manual Username Linking
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUsernameInput.trim()) {
      toast.error('Silakan isi username GitHub Anda.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set('username', manualUsernameInput.trim());

      const res = await linkGitHubManualAction(formData);
      if (res.success) {
        setGithubUsername(manualUsernameInput.trim());
        setShowManualForm(false);
        setManualUsernameInput('');
        toast.success('Username GitHub berhasil disimpan ke profil!');
        router.refresh();
      } else {
        toast.error(res.error || 'Gagal menyimpan username GitHub.');
      }
    });
  };

  return (
    <>
      <Card className="border border-border/70 shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background">
                <svg
                  className="h-5 w-5 fill-current"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  Integrasi Akun GitHub
                </CardTitle>
                <CardDescription className="text-xs">
                  Tautkan identitas GitHub untuk sinkronisasi commit otomatis &
                  pelacakan task
                </CardDescription>
              </div>
            </div>

            {/* Status Badge */}
            <div>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Terhubung
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                  Belum Terhubung
                </span>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          {isConnected ? (
            /* ================= STATE: CONNECTED ================= */
            <div className="rounded-xl border border-border/70 bg-card/60 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-muted/60 text-muted-foreground font-semibold">
                    @{githubUsername?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://github.com/${githubUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-1 text-sm font-semibold hover:text-primary transition-colors"
                      >
                        <span>@{githubUsername}</span>
                        <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {initialConnectedAt
                        ? `Terhubung sejak ${new Date(
                            initialConnectedAt
                          ).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}`
                        : 'Akun aktif dan siap menerima pelacakan commit'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                    onClick={() => setShowUnlinkDialog(true)}
                    disabled={isPending}
                  >
                    <Unlink className="h-3.5 w-3.5 mr-1.5" />
                    Putuskan Tautan
                  </Button>
                </div>
              </div>

              {/* Integration Benefits Summary */}
              <div className="mt-4 grid grid-cols-1 gap-2 pt-3 border-t border-border/50 sm:grid-cols-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <GitCommit className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Commit sinkron otomatis</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <GitBranch className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span>Pelacakan nama branch</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <GitPullRequest className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                  <span>Validasi PR reviewer</span>
                </div>
              </div>
            </div>
          ) : (
            /* ================= STATE: DISCONNECTED ================= */
            <div className="space-y-4">
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4">
                <p className="text-sm text-foreground/90 font-medium">
                  Mengapa perlu menautkan akun GitHub?
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Dengan menghubungkan akun GitHub, sistem WorkHub dapat secara
                  otomatis mendeteksi commit dari branch tugas Anda, memvalidasi
                  kontribusi tim, dan menampilkan riwayat commit langsung di
                  halaman detail task tanpa repot membuka tab terpisah.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    className="flex items-center gap-2 font-medium"
                    disabled={isLinkingOAuth}
                    onClick={handleLinkGitHubOAuth}
                  >
                    {isLinkingOAuth ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Mengarahkan ke GitHub...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-4 w-4 fill-current"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                        <span>Hubungkan Akun GitHub</span>
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => setShowManualForm(!showManualForm)}
                  >
                    <span>Tautkan manual via username</span>
                    {showManualForm ? (
                      <ChevronUp className="h-3 w-3 ml-1" />
                    ) : (
                      <ChevronDown className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Collapsible Manual Input */}
              {showManualForm && (
                <form
                  onSubmit={handleManualSubmit}
                  className="rounded-xl border border-border/70 bg-card p-4 space-y-3"
                >
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="manual-username"
                      className="text-xs font-medium"
                    >
                      Username Akun GitHub
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">
                          @
                        </span>
                        <Input
                          id="manual-username"
                          placeholder="contoh: wsantika"
                          value={manualUsernameInput}
                          onChange={(e) =>
                            setManualUsernameInput(e.target.value)
                          }
                          className="pl-7 text-sm"
                          disabled={isPending}
                        />
                      </div>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isPending || !manualUsernameInput.trim()}
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Simpan'
                        )}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Gunakan opsi ini jika ingin menghubungkan username tanpa
                      redirect OAuth browser.
                    </p>
                  </div>
                </form>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="border-t border-border/50 bg-muted/10 px-6 py-3">
          <p className="text-[11px] text-muted-foreground">
            WorkHub hanya meminta izin baca profil dan commit publik/organisasi
            yang relevan. Kredensial Anda aman.
          </p>
        </CardFooter>
      </Card>

      {/* Confirmation Dialog for Unlink */}
      <Dialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Putuskan Tautan Akun GitHub?</DialogTitle>
            <DialogDescription className="text-xs">
              Akun GitHub{' '}
              <strong className="text-foreground">@{githubUsername}</strong>{' '}
              tidak akan lagi terhubung ke profil WorkHub Anda. Commit baru yang
              Anda buat mungkin tidak teratribusi secara otomatis ke tugas-tugas
              aktif.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowUnlinkDialog(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleUnlinkGitHub}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  <span>Memutuskan...</span>
                </>
              ) : (
                'Putuskan Tautan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
