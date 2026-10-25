// ----------------------------------------------------------------------------------
//  Name:    Modal.tsx
//  Author:  Mark Casey
//
//  Purpose: Reusable modal shell rendered through a portal, with Escape-to-close
//           and backdrop-click handling.
//
//  Features:
//   • <Modal /> → modal shell component
// ----------------------------------------------------------------------------------

// ── Imports ────────────────────────────────────────────────
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// ── Types ──────────────────────────────────────────────────
interface ModalProps {
  title:    string;
  onClose:  () => void;
  children: ReactNode;
  wide?:    boolean;
}

// ══ Component ══════════════════════════════════════════════
export function Modal({ title, onClose, children, wide = false }: ModalProps) {

  useEffect(() => {

    const onKey = (event: KeyboardEvent) => {

      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="modal-overlay"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`modal-panel${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
