import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { z } from 'zod';
import { ROUTES } from '@/config/routes';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import { createClient } from '@/lib/supabase/server';
import { getKnowledgeDocument } from '@/features/ai/queries/team-knowledge.queries';
import {
  canManageKnowledge,
  parseKnowledgeMarkdown,
} from '@/features/ai/rag/team-knowledge';

export const metadata: Metadata = { title: 'Rujukan Panduan Tim | Workhub' };

export default async function KnowledgeDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getUserProfile();
  if (!profile) redirect(ROUTES.login);
  if (profile.role !== 'leader') notFound();

  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const document = await getKnowledgeDocument(
    await createClient(),
    id.data,
    'published'
  );
  if (
    !document ||
    (document.team_id !== profile.team_id && !canManageKnowledge(profile))
  )
    notFound();

  const parsed = parseKnowledgeMarkdown(document.markdown);
  if (!parsed) notFound();

  return (
    <article className="mx-auto max-w-3xl space-y-6 pb-12">
      <header className="space-y-2 border-b pb-4">
        <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">
          {document.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          Versi {document.version}
        </p>
      </header>
      {parsed.sections.map(({ id, heading, body }) => (
        <section
          key={id}
          id={id}
          className="scroll-mt-4 space-y-2"
          aria-labelledby={`${id}-heading`}
        >
          <h2
            id={`${id}-heading`}
            className="break-words text-lg font-semibold"
          >
            {heading}
          </h2>
          <div className="prose prose-sm max-w-none break-words dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              skipHtml
              disallowedElements={['a', 'img']}
              unwrapDisallowed
              components={{
                table: ({ children }) => (
                  <div className="my-3 overflow-x-auto">
                    <table>{children}</table>
                  </div>
                ),
              }}
            >
              {body}
            </ReactMarkdown>
          </div>
        </section>
      ))}
    </article>
  );
}
