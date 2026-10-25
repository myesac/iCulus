// ----------------------------------------------------------------------------------
//  Name:    SplashScreen.tsx
//  Author:  Mark Casey
//
//  Purpose: Boot-time splash overlay shown while the app gate timer runs.
//
//  Features:
//   • <SplashScreen /> → splash overlay component
// ----------------------------------------------------------------------------------

// ── Imports ────────────────────────────────────────────────
import './splash.css';

// ══ Component ══════════════════════════════════════════════
export function SplashScreen() {

  return (
    <div className="splash">
      <div className="splash-scanlines" aria-hidden="true" />
      <div className="splash-inner">
        <div className="splash-title">iCulus</div>
        <div className="splash-subtitle">LINK YOUR WORLD</div>
        <div className="splash-boot">
          <span className="splash-cursor">▮</span>
          <span> INITIALIZING CONTACT NETWORK...</span>
        </div>
      </div>
    </div>
  );
}
