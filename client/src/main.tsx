// ----------------------------------------------------------------------------------
//  Name:    main.tsx
//  Author:  Mark Casey
//
//  Purpose: Client entry point. Mounts the React application into #root under
//           StrictMode.
//
//  Features:
//   • <App /> → the root application component
// ----------------------------------------------------------------------------------

// ── Imports ────────────────────────────────────────────────
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
