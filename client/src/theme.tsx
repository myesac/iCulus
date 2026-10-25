// ----------------------------------------------------------------------------------
//  Name:    theme.tsx
//  Author:  Mark Casey
//
//  Purpose: Light/dark theme context. Persists the choice to localStorage and
//           applies it as a data-theme attribute on <html>.
//
//  Features:
//   • ThemeProvider → context provider component
//   • useTheme()    → ThemeContextValue
// ----------------------------------------------------------------------------------

// ── Imports ────────────────────────────────────────────────
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// ── Types ──────────────────────────────────────────────────
type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme:       Theme;
  toggleTheme: () => void;
}

// ── Constants ──────────────────────────────────────────────
const ThemeContext = createContext<ThemeContextValue | null>(null);

// ══ Helpers ════════════════════════════════════════════════
function getInitialTheme(): Theme {

  if (typeof window === 'undefined') {

    return 'dark';
  }

  try {

    const stored = window.localStorage.getItem('iculus.theme');

    if (stored === 'light' || stored === 'dark') {

      return stored;
    }

  } catch {

    // localStorage unavailable; fall through.
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// ══ Provider ═══════════════════════════════════════════════
export function ThemeProvider({ children }: { children: ReactNode }) {

  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {

    document.documentElement.setAttribute('data-theme', theme);

    try {

      window.localStorage.setItem('iculus.theme', theme);

    } catch {

      // Ignore storage errors.
    }
  }, [theme]);

  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'));

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

// ══ Hook ═══════════════════════════════════════════════════
export function useTheme(): ThemeContextValue {

  const ctx = useContext(ThemeContext);

  if (!ctx) {

    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return ctx;
}
