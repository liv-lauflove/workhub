import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import { createClient } from '@/lib/supabase/server';
import {
  KnowledgePreviewForm,
  KnowledgeStateForm,
  KnowledgeUploadForm,
} from '@/features/ai/components/team-knowledge-forms';
import { getTeamKnowledgeByStatus } from '@/features/ai/queries/team-knowledge.queries';
import {
  canManageKnowledge,
  parseKnowledgeMarkdown,
} from '@/features/ai/rag/team-knowledge';

export const metadata: Metadata = { title: 'Panduan AI Tim | Workhub' };

export default async function KnowledgeBasePage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const profile = await getUserProfile();
  if (!profile) redirect(ROUTES.login);
  if (!canManageKnowledge(profile)) notFound();

  const supabase = await createClient();
  const { data: teams, error } = await supabase
    .from('teams')
    .select('id, name')
    .order('name');
  if (error) throw new Error('Daftar tim gagal dimuat.');

  const requested = (await searchParams).team;
  const team = teams.find(({ id }) => id === requested) ?? teams[0];
  const [draft, published] = team
    ? await Promise.all([
        getTeamKnowledgeByStatus(supabase, team.id, 'draft'),
        getTeamKnowledgeByStatus(supabase, team.id, 'published'),
      ])
    : [null, null];
  const review = draft && parseKnowledgeMarkdown(draft.markdown);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <header className="space-y-2">
        <Link
          href={ROUTES.settings}
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4"
        >
          Pengaturan
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Panduan AI Tim
        </h1>
        <p className="text-sm text-muted-foreground">
          Kelola SOP Markdown yang dirujuk asisten Workhub saat menjawab
          pertanyaan tim.
        </p>
      </header>

      {team ? (
        <>
          <form
            action={ROUTES.knowledgeBase}
            method="get"
            className="space-y-2"
          >
            <label
              htmlFor="knowledge-team"
              className="block text-sm font-medium"
            >
              Tim
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <select
                id="knowledge-team"
                name="team"
                key={team.id}
                defaultValue={team.id}
                className="min-h-11 min-w-0 max-w-full rounded-md border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring"
              >
                {teams.map(({ id, name }) => (
                  <option value={id} key={id}>
                    {name}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="outline" className="min-h-11">
                Lihat tim
              </Button>
            </div>
          </form>

          <section
            className="space-y-3 rounded-lg border bg-card p-4 sm:p-6"
            aria-labelledby="knowledge-current"
          >
            <h2 id="knowledge-current" className="text-lg font-semibold">
              Panduan terbit
            </h2>
            {published ? (
              <div className="space-y-3" key={published.id}>
                <Link
                  href={ROUTES.knowledgeDocument(published.id)}
                  prefetch={false}
                  className="block break-words text-sm font-medium text-primary underline underline-offset-4"
                >
                  {published.title} · v{published.version}
                </Link>
                <KnowledgeStateForm id={published.id} operation="withdraw" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Belum ada panduan terbit untuk {team.name}. Unggah draf untuk
                mulai.
              </p>
            )}
          </section>

          <section
            className="space-y-4 rounded-lg border bg-card p-4 sm:p-6"
            aria-labelledby="knowledge-draft"
          >
            <div className="space-y-1">
              <h2 id="knowledge-draft" className="text-lg font-semibold">
                Draf {team.name}
              </h2>
              <a
                href="/templates/panduan-tim.md"
                download
                className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4"
              >
                Unduh template Markdown
              </a>
            </div>
            <KnowledgeUploadForm key={team.id} teamId={team.id} />

            {draft && review ? (
              <div key={draft.id} className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <h3 className="break-words font-medium">
                    {draft.title} · v{draft.version}
                  </h3>
                  <details className="text-sm">
                    <summary className="min-h-11 cursor-pointer py-3 font-medium">
                      Bagian yang terbaca ({review.sections.length})
                    </summary>
                    <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                      {review.sections.map(({ id, heading }) => (
                        <li key={id} className="break-words">
                          {heading}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
                <KnowledgePreviewForm id={draft.id} />
                <div className="space-y-2 border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    Terbitkan setelah isi dan hasil uji sesuai SOP tim.
                  </p>
                  <KnowledgeStateForm id={draft.id} operation="publish" />
                </div>
              </div>
            ) : null}
          </section>
        </>
      ) : (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          Buat tim di menu Member &amp; Tim sebelum mengunggah panduan.
        </p>
      )}
    </div>
  );
}
