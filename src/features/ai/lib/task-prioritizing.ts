import type {
  TaskPriorityLevel,
  TaskPriorityPredictionResult,
} from '../types/ai.types';

/**
 * Parses and validates LLM raw output into TaskPriorityPredictionResult.
 */
export function parsePredictionOutput(
  rawText: string,
  title: string,
  isCsComplaint?: boolean
): TaskPriorityPredictionResult {
  try {
    let clean = rawText.trim();
    if (clean.startsWith('```')) {
      clean = clean
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/, '')
        .trim();
    }
    const parsed = JSON.parse(clean);
    const validPriorities: TaskPriorityLevel[] = [
      'low',
      'medium',
      'high',
      'critical',
    ];
    const normalizedPriority = parsed.suggestedPriority?.toLowerCase();
    const priority = validPriorities.includes(normalizedPriority)
      ? (normalizedPriority as TaskPriorityLevel)
      : isCsComplaint
        ? 'high'
        : 'medium';

    return {
      suggestedPriority: priority,
      estimatedDuration: parsed.estimatedDuration || '1-2 jam',
      reason:
        parsed.reason ||
        'Rekomendasi prioritas berdasarkan analisis judul dan deskripsi tugas.',
      confidenceScore:
        typeof parsed.confidenceScore === 'number'
          ? parsed.confidenceScore
          : 0.85,
    };
  } catch {
    return generateFallbackPrediction(title, isCsComplaint);
  }
}

/**
 * Heuristics fallback when LLM is unreachable or responds in non-JSON format (Issue #45).
 */
export function generateFallbackPrediction(
  title: string,
  isCsComplaint?: boolean
): TaskPriorityPredictionResult {
  const lower = title.toLowerCase();
  if (
    isCsComplaint ||
    lower.includes('crash') ||
    lower.includes('down') ||
    lower.includes('critical') ||
    lower.includes('security') ||
    lower.includes('pembayaran') ||
    lower.includes('payment')
  ) {
    return {
      suggestedPriority: 'critical',
      estimatedDuration: '2-4 jam',
      reason: isCsComplaint
        ? 'Laporan keluhan pelanggan (CS) memerlukan respons segera dan penanganan prioritas utama.'
        : 'Tugas berkaitan dengan stabilitas sistem atau transaksi krusial yang berdampak luas.',
      confidenceScore: 0.9,
    };
  }

  if (
    lower.includes('bug') ||
    lower.includes('error') ||
    lower.includes('fix') ||
    lower.includes('gagal') ||
    lower.includes('rusak') ||
    lower.includes('break')
  ) {
    return {
      suggestedPriority: 'high',
      estimatedDuration: '1-2 jam',
      reason:
        'Perbaikan kendala fungsional atau bug disarankan diselesaikan dengan prioritas tinggi agar tidak menghambat tim.',
      confidenceScore: 0.85,
    };
  }

  if (
    lower.includes('ui') ||
    lower.includes('style') ||
    lower.includes('typo') ||
    lower.includes('warna') ||
    lower.includes('padding') ||
    lower.includes('margin') ||
    lower.includes('icon') ||
    lower.includes('font')
  ) {
    return {
      suggestedPriority: 'low',
      estimatedDuration: '30 menit',
      reason:
        'Penyesuaian visual atau kosmetik ringan dapat diselesaikan dengan prioritas santai.',
      confidenceScore: 0.8,
    };
  }

  return {
    suggestedPriority: 'medium',
    estimatedDuration: '2-4 jam',
    reason:
      'Pengembangan fitur atau penugasan standar dalam alur kerja sprint normal.',
    confidenceScore: 0.75,
  };
}
