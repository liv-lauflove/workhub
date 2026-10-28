/**
 * Feature flags for gradual rollout.
 * Experimental features (AI, GitHub) can be toggled off independently.
 * See PRD §11 — features must be wrapped with flags.
 */
export const featureFlags = {
  /** Phase 3: GitHub integration */
  githubIntegration: false,
  /** Phase 4: AI chatbot */
  aiChatbot: false,
  /** Phase 4: AI auto-prioritizing */
  aiAutoPriority: false,
  /** Phase 4: AI overload warning */
  aiWarning: false,
} as const;

export type FeatureFlag = keyof typeof featureFlags;

/** Check if a feature is enabled */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}
