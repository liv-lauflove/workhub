/**
 * Type definitions and predefined configurations for Workhub AI Chatbot (Issue #44).
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  isCached?: boolean;
  provider?: string;
  model?: string;
}

export type ChatStatus = 'idle' | 'loading' | 'error';

export interface QuickPromptSuggestion {
  id: string;
  label: string;
  prompt: string;
  category: 'workload' | 'priority' | 'milestone' | 'productivity';
}

/**
 * Curated suggestions for Engineering Managers and Team Leads to kick off analytics dialogues.
 */
export const QUICK_PROMPT_SUGGESTIONS: QuickPromptSuggestion[] = [
  {
    id: 'sprint-workload',
    label: '📊 Analisis Beban Kerja',
    prompt:
      'Tolong analisis beban kerja tim sprint ini dan berikan rekomendasi untuk menghindari burnout.',
    category: 'workload',
  },
  {
    id: 'high-priority-risks',
    label: '⚠️ Task Kritis Tertunda',
    prompt:
      'Identifikasi task prioritas tinggi (urgent/high) yang berisiko melewati deadline sprint.',
    category: 'priority',
  },
  {
    id: 'milestone-status',
    label: '🎯 Status Milestone',
    prompt:
      'Bagaimana progres penyelesaian milestone aktif kita saat ini? Apakah ada bottleneck utama?',
    category: 'milestone',
  },
  {
    id: 'team-recommendations',
    label: '💡 Tips Produktivitas',
    prompt:
      'Sebagai Engineering Manager, apa saran taktis untuk meningkatkan velocity sprint mendatang?',
    category: 'productivity',
  },
];

/**
 * Creates the initial welcome greeting message from the AI assistant.
 */
export function createWelcomeMessage(
  userName?: string,
  role?: string
): ChatMessage {
  const greetingName = userName ? `, **${userName}**` : '';
  const isLeader = role === 'leader';

  const roleText = isLeader
    ? 'Siap membantu menganalisis sprint, menyeimbangkan beban kerja tim, dan mendeteksi bottleneck proyek.'
    : 'Siap membantu menjawab pertanyaan seputar progres task dan prioritas kerja tim.';

  return {
    id: 'welcome-message',
    role: 'assistant',
    content: `Halo${greetingName}! 👋 Saya **Workhub AI Assistant** (Engineering Manager & Data Analyst).\n\n${roleText}\n\nSilakan ajukan pertanyaan atau pilih salah satu rekomendasi cepat di bawah!`,
    createdAt: new Date().toISOString(),
  };
}
