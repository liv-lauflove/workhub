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

/**
 * Safely parses human-readable duration strings (Indonesian/English) into numeric hours
 * for storage in ai_suggestion_overrides.suggested_duration_hours (Issue #46).
 */
export function parseDurationToHours(
  durationStr?: string | null
): number | null {
  if (!durationStr || typeof durationStr !== 'string') return null;

  const lower = durationStr.toLowerCase().trim();

  // Range pattern like "1-2 jam", "2 - 4 jam", "2-3 hari", "1-2 weeks"
  const rangeMatch = lower.match(
    /^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(minggu|weeks?|hari|days?|menit|minutes?|mins?|jam|hours?|hrs?|[hdw])$/
  );
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    const unit = rangeMatch[3];
    const avg = (min + max) / 2;

    if (unit === 'minggu' || unit.startsWith('week') || unit === 'w') {
      return Math.round(avg * 40 * 100) / 100;
    }
    if (unit === 'hari' || unit.startsWith('day') || unit === 'd') {
      return Math.round(avg * 8 * 100) / 100; // 8 hours per workday
    }
    if (unit.startsWith('menit') || unit.startsWith('min')) {
      return Math.round((avg / 60) * 100) / 100;
    }
    return Math.round(avg * 100) / 100; // hours (jam, hour, hrs, h)
  }

  // Single pattern like "30 menit", "2 jam", "8 h", "1 hari", "2 weeks"
  const singleMatch = lower.match(
    /^(\d+(?:\.\d+)?)\s*(minggu|weeks?|hari|days?|menit|minutes?|mins?|jam|hours?|hrs?|[hdw])$/
  );
  if (singleMatch) {
    const val = parseFloat(singleMatch[1]);
    const unit = singleMatch[2];

    if (unit === 'minggu' || unit.startsWith('week') || unit === 'w') {
      return Math.round(val * 40 * 100) / 100;
    }
    if (unit === 'hari' || unit.startsWith('day') || unit === 'd') {
      return Math.round(val * 8 * 100) / 100;
    }
    if (unit.startsWith('menit') || unit.startsWith('min')) {
      return Math.round((val / 60) * 100) / 100;
    }
    return Math.round(val * 100) / 100;
  }

  // Fallback: search for numbers followed by unit
  if (lower.includes('menit') || lower.includes('min')) {
    const num = parseFloat(lower);
    if (!isNaN(num)) return Math.round((num / 60) * 100) / 100;
  }
  if (lower.includes('minggu') || lower.includes('week')) {
    const num = parseFloat(lower);
    if (!isNaN(num)) return Math.round(num * 40 * 100) / 100;
  }
  if (lower.includes('hari') || lower.includes('day')) {
    const num = parseFloat(lower);
    if (!isNaN(num)) return Math.round(num * 8 * 100) / 100;
  }
  if (
    lower.includes('jam') ||
    lower.includes('hour') ||
    lower.includes('hr') ||
    /\b\d+\s*h\b/.test(lower)
  ) {
    const num = parseFloat(lower);
    if (!isNaN(num)) return Math.round(num * 100) / 100;
  }

  return null;
}

/**
 * Evaluates whether an AI suggestion was overridden by the user (Issue #46).
 */
export function detectPriorityOverride(
  finalPriority: string,
  suggestedPriority?: string | null
): boolean {
  if (!suggestedPriority) return false;
  const cleanSuggested = suggestedPriority.trim().toLowerCase();
  const cleanFinal = finalPriority.trim().toLowerCase();
  if (!cleanSuggested || !cleanFinal) return false;
  return cleanSuggested !== cleanFinal;
}
