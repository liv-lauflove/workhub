'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ROUTES } from '@/config/routes';
import { getUserProfile } from '@/features/auth/queries/auth.queries';
import { createClient } from '@/lib/supabase/server';
import { invokeLlm } from '../lib/llm-client';
import { getKnowledgeDocument } from '../queries/team-knowledge.queries';
import {
  canManageKnowledge,
  findKnowledgeSections,
  knowledgeSystemPrompt,
  MAX_KNOWLEDGE_BYTES,
  NO_KNOWLEDGE_ANSWER,
  parseKnowledgeMarkdown,
} from '../rag/team-knowledge';

interface KnowledgeActionState {
  error?: string;
  message?: string;
  preview?: { answer: string; sections: string[] };
}

const uuid = z.uuid();
const forbidden = {
  error: 'Hanya Leader Management yang bisa mengelola panduan.',
};

export async function uploadKnowledgeDraftAction(
  _previous: KnowledgeActionState,
  form: FormData
): Promise<KnowledgeActionState> {
  const profile = await getUserProfile();
  if (!profile || !canManageKnowledge(profile)) return forbidden;

  const teamId = uuid.safeParse(form.get('teamId'));
  const file = form.get('markdown');
  if (!teamId.success) return { error: 'Pilih tim yang valid.' };
  if (
    !(file instanceof File) ||
    !file.size ||
    !/\.md$/i.test(file.name.trim())
  ) {
    return { error: 'Pilih file Markdown dengan ekstensi .md.' };
  }
  if (file.size > MAX_KNOWLEDGE_BYTES) {
    return { error: 'Ukuran file maksimum 64 KB.' };
  }

  let markdown: string;
  try {
    markdown = new TextDecoder('utf-8', { fatal: true }).decode(
      await file.arrayBuffer()
    );
  } catch {
    return { error: 'Simpan file Markdown dengan encoding UTF-8.' };
  }
  const parsed = parseKnowledgeMarkdown(markdown);
  if (!parsed || markdown.includes('\0')) {
    return {
      error:
        'Tulis judul dan setidaknya satu bagian berisi teks. Periksa juga penutup blok kode.',
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc('create_ai_knowledge_draft', {
      p_team_id: teamId.data,
      p_title: parsed.title,
      p_markdown: markdown,
    });
    if (error)
      return { error: 'Draf gagal disimpan. Periksa tim dan coba lagi.' };
  } catch {
    return { error: 'Draf gagal disimpan. Periksa tim dan coba lagi.' };
  }

  revalidatePath(ROUTES.knowledgeBase);
  return {
    message:
      'Draf tersimpan. Kamu bisa menguji pertanyaan sebelum menerbitkan.',
  };
}

export async function previewKnowledgeDraftAction(
  _previous: KnowledgeActionState,
  form: FormData
): Promise<KnowledgeActionState> {
  const profile = await getUserProfile();
  if (!profile || !canManageKnowledge(profile)) return forbidden;

  const id = uuid.safeParse(form.get('id'));
  const question = z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .safeParse(form.get('question'));
  if (!id.success || !question.success) {
    return { error: 'Ketik pertanyaan sepanjang 1 hingga 1.000 karakter.' };
  }

  try {
    const supabase = await createClient();
    const draft = await getKnowledgeDocument(supabase, id.data, 'draft');
    const parsed = draft && parseKnowledgeMarkdown(draft.markdown);
    if (!parsed) return { error: 'Draf tidak tersedia. Muat ulang halaman.' };

    const sections = findKnowledgeSections(parsed.sections, question.data);
    if (!sections.length)
      return { preview: { answer: NO_KNOWLEDGE_ANSWER, sections: [] } };

    const answer = await invokeLlm({
      prompt: question.data,
      systemPrompt: knowledgeSystemPrompt(sections),
      maxTokens: 650,
    });
    return {
      preview: {
        answer: answer.text.trim() || NO_KNOWLEDGE_ANSWER,
        sections: sections.map((section) => section.heading),
      },
    };
  } catch {
    return { error: 'Pratinjau gagal. Coba kirim ulang pertanyaan.' };
  }
}

export async function changeKnowledgeStateAction(
  _previous: KnowledgeActionState,
  form: FormData
): Promise<KnowledgeActionState> {
  const profile = await getUserProfile();
  if (!profile || !canManageKnowledge(profile)) return forbidden;

  const id = uuid.safeParse(form.get('id'));
  const action = z
    .enum(['publish', 'withdraw'])
    .safeParse(form.get('operation'));
  if (!id.success || !action.success)
    return { error: 'Dokumen atau tindakan tidak valid.' };

  try {
    const supabase = await createClient();
    if (action.data === 'publish') {
      const draft = await getKnowledgeDocument(supabase, id.data, 'draft');
      if (!draft || !parseKnowledgeMarkdown(draft.markdown)) {
        return {
          error:
            'Draf tidak dapat diterbitkan. Periksa Markdown atau muat ulang halaman.',
        };
      }
    }

    const { error } = await supabase.rpc('set_ai_knowledge_document_state', {
      p_id: id.data,
      p_action: action.data,
    });
    if (error)
      return {
        error:
          'Status dokumen gagal diperbarui. Muat ulang halaman dan coba lagi.',
      };
  } catch {
    return { error: 'Panduan tidak dapat dimuat. Coba lagi.' };
  }

  revalidatePath(ROUTES.knowledgeBase);
  revalidatePath('/knowledge/[id]', 'page');
  return {
    message:
      action.data === 'publish'
        ? 'Panduan diterbitkan.'
        : 'Panduan ditarik dari chat.',
  };
}
