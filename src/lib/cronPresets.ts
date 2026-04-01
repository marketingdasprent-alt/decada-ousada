/**
 * Shared cron presets used across IntegracaoDialog (create) and IntegracaoDetailModal (edit).
 */

export const CRON_PRESETS: Record<string, string> = {
  weekly: '0 23 * * 0',     // Sunday 23:00 UTC ≈ Monday 00:00 Lisbon
};

/**
 * Map a raw cron expression back to a preset key, or 'custom' if it doesn't match.
 */
export function cronExpressionToPreset(expr: string | null | undefined): string {
  if (!expr) return 'disabled';
  for (const [key, value] of Object.entries(CRON_PRESETS)) {
    if (expr === value) return key;
  }
  return 'custom';
}

/**
 * Get the cron expression for a preset key, or the custom expression.
 */
export function presetToCronExpression(preset: string, customExpr?: string): string | null {
  if (preset === 'disabled') return null;
  if (preset === 'custom') return customExpr || null;
  return CRON_PRESETS[preset] || null;
}
