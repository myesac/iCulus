// ----------------------------------------------------------------------------------
//  Name:    TopBar.tsx
//  Author:  Mark Casey
//
//  Purpose: Top navigation bar with the layout switcher, rescan action, and
//           light/dark theme toggle.
//
//  Features:
//   • <TopBar /> → top bar component
// ----------------------------------------------------------------------------------

// ── Imports ────────────────────────────────────────────────
import type { LayoutKind } from '../types';
import { useTheme } from '../theme';

// ── Constants ──────────────────────────────────────────────
const LAYOUTS: readonly { kind: LayoutKind; label: string }[] = [
  { kind: 'force', label: 'Force' },
  { kind: 'circle', label: 'Circle' },
  { kind: 'hex', label: 'Hex' },
  { kind: 'spiral', label: 'Spiral' },
  { kind: 'groups', label: 'Groups' },
] as const;

// ── Types ──────────────────────────────────────────────────
interface TopBarProps {
  layout:         LayoutKind;
  onLayoutChange: (layout: LayoutKind) => void;
  onRescanLinks:  () => void;
}

// ══ Component ══════════════════════════════════════════════
export function TopBar({ layout, onLayoutChange, onRescanLinks }: TopBarProps) {

  const { theme, toggleTheme } = useTheme();

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="brand-mark">iC</span>
        <span className="brand-name">iCulus</span>
      </div>

      <div className="layout-switcher" role="tablist" aria-label="Graph layout">
        {LAYOUTS.map((item) => (
          <button
            key={item.kind}
            type="button"
            role="tab"
            aria-selected={layout === item.kind}
            className={`layout-pill${layout === item.kind ? ' is-active' : ''}`}
            onClick={() => onLayoutChange(item.kind)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="topbar-actions">
        <button type="button" className="btn btn-ghost" onClick={onRescanLinks} title="Re-detect links between contacts">
          ↻ Rescan links
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </header>
  );
}
