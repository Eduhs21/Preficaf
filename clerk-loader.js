/* ============================================================
   PRECIFICA FÁCIL — Clerk Loader (clerk-loader.js)
   Carrega o Clerk dinamicamente usando a chave em /api/clerk-config
   (evita hardcode de publishable key no HTML e reduz race conditions)
   ============================================================ */

'use strict';

(function () {
  const CLERK_SRC = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js';

  async function getPublishableKey() {
    try {
      const res = await fetch('/api/clerk-config', { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      return data && typeof data.publishableKey === 'string' ? data.publishableKey : null;
    } catch (e) {
      return null;
    }
  }

  async function loadClerk() {
    if (window.Clerk) {
      if (typeof window.__initClerk === 'function') window.__initClerk();
      return;
    }

    const publishableKey = await getPublishableKey();
    if (!publishableKey) {
      console.warn('[clerk-loader] CLERK_PUBLISHABLE_KEY não configurada; Clerk não será carregado.');
      return;
    }

    const existing = document.querySelector('script[data-clerk-publishable-key]');
    if (existing) return;

    const script = document.createElement('script');
    script.src = CLERK_SRC;
    script.type = 'text/javascript';
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-clerk-publishable-key', publishableKey);
    script.onload = function () {
      if (typeof window.__initClerk === 'function') window.__initClerk();
    };
    script.onerror = function () {
      console.warn('[clerk-loader] Falha ao carregar Clerk CDN.');
    };
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadClerk);
  } else {
    loadClerk();
  }
})();

