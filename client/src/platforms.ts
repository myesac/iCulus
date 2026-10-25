// ----------------------------------------------------------------------------------
//  Name:    platforms.ts
//  Author:  Mark Casey
//
//  Purpose: Platform presets used to populate the account form, and a lookup
//           helper that matches a preset by key or display name.
//
//  Features:
//   • PlatformPreset  → interface
//   • PLATFORM_PRESETS → readonly PlatformPreset[] constant
//   • presetFor(value) → PlatformPreset | undefined
// ----------------------------------------------------------------------------------
export interface PlatformPreset {
  key:   string;
  label: string;
  icon:  string;
  color: string;
}

// ── Constants ──────────────────────────────────────────────
export const PLATFORM_PRESETS: readonly PlatformPreset[] = [
  { key: 'linkedin', label: 'LinkedIn', icon: 'in', color: '#0A66C2' },
  { key: 'outlook', label: 'Outlook', icon: 'O', color: '#0078D4' },
  { key: 'gmail', label: 'Gmail', icon: 'M', color: '#EA4335' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'W', color: '#25D366' },
  { key: 'facebook', label: 'Facebook', icon: 'f', color: '#1877F2' },
  { key: 'x', label: 'X', icon: '𝕏', color: '#14171A' },
  { key: 'instagram', label: 'Instagram', icon: '◉', color: '#E4405F' },
  { key: 'telegram', label: 'Telegram', icon: 'T', color: '#229ED9' },
  { key: 'tiktok', label: 'TikTok', icon: '♪', color: '#010101' },
  { key: 'discord', label: 'Discord', icon: 'D', color: '#5865F2' },
  { key: 'other', label: 'Other', icon: '●', color: '#6C7A89' },
] as const;

// ══ Lookup ═════════════════════════════════════════════════
export function presetFor(value: string): PlatformPreset | undefined {

  const needle = value.trim().toLowerCase();

  return PLATFORM_PRESETS.find(
    (p) => p.key === needle || p.label.toLowerCase() === needle,
  );
}
