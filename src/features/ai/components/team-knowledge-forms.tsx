'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  changeKnowledgeStateAction,
  previewKnowledgeDraftAction,
  uploadKnowledgeDraftAction,
} from '../actions/team-knowledge.actions';

function Feedback({ state }: { state: { error?: string; message?: string } }) {
  if (state.error)
    return (
      <p role="alert" className="text-sm text-destructive">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="text-sm text-foreground">
        {state.message}
      </p>
    );
  return null;
}

export function KnowledgeUploadForm({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState(
    uploadKnowledgeDraftAction,
    {}
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="teamId" value={teamId} />
      <label htmlFor="knowledge-markdown" className="block text-sm font-medium">
        File Markdown
      </label>
      <Input
        id="knowledge-markdown"
        type="file"
        name="markdown"
        accept=".md,text/markdown"
        required
        className="h-11"
        aria-describedby="knowledge-upload-help"
      />
      <p id="knowledge-upload-help" className="text-sm text-muted-foreground">
        Pilih file .md UTF-8 maksimal 64 KB. Unggahan baru mengganti draf tim
        ini.
      </p>
      <Button type="submit" className="min-h-11" disabled={pending}>
        {pending ? 'Menyimpan draf…' : 'Simpan draf'}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function KnowledgePreviewForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(
    previewKnowledgeDraftAction,
    {}
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <label htmlFor="knowledge-question" className="block text-sm font-medium">
        Pertanyaan untuk draf
      </label>
      <Input
        id="knowledge-question"
        name="question"
        placeholder="Kapan task boleh masuk Done?"
        className="h-11"
        maxLength={1000}
        required
      />
      <Button
        variant="outline"
        type="submit"
        className="min-h-11"
        disabled={pending}
      >
        {pending ? 'Mencari jawaban…' : 'Uji jawaban'}
      </Button>
      <Feedback state={state} />
      {state.preview ? (
        <div
          role="status"
          className="space-y-2 rounded-lg border bg-background p-4 text-sm"
        >
          <p className="whitespace-pre-wrap break-words">
            {state.preview.answer}
          </p>
          {state.preview.sections.length ? (
            <ul
              aria-label="Bagian rujukan"
              className="list-disc space-y-1 pl-5 text-muted-foreground"
            >
              {state.preview.sections.map((heading, index) => (
                <li key={`${index}-${heading}`}>{heading}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

export function KnowledgeStateForm({
  id,
  operation,
}: {
  id: string;
  operation: 'publish' | 'withdraw';
}) {
  const [state, action, pending] = useActionState(
    changeKnowledgeStateAction,
    {}
  );
  const publishes = operation === 'publish';

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="operation" value={operation} />
      <Button
        type="submit"
        variant={publishes ? 'default' : 'outline'}
        className="min-h-11"
        disabled={pending}
      >
        {pending
          ? 'Memperbarui…'
          : publishes
            ? 'Terbitkan panduan'
            : 'Tarik dari chat'}
      </Button>
      <Feedback state={state} />
    </form>
  );
}
