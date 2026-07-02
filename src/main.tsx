import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

const SERVICE_WORKER_VERSION = '2026-07-02-coach-mode';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js?v=${SERVICE_WORKER_VERSION}`)
      .then((registration) => {
        registration.update().catch(() => {
          // PWA freshness is a bonus path; gameplay should never depend on it.
        });

        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          installing?.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              installing.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch(() => {
        // PWA installability is a bonus path; gameplay should never depend on it.
      })
  })
}
