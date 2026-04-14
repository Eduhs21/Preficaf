/* ============================================================
   PRECIFICA FÁCIL — Clerk Loader (clerk-loader.js)
   Carrega o Clerk dinamicamente usando a chave em /api/clerk-config
   (evita hardcode de publishable key no HTML e reduz race conditions)
   ============================================================ */

'use strict';

(function () {
  const CLERK_SRC = 'https://cdn.clerk.com/npm/@clerk/clerk-js@latest/dist/clerk.browser.js';

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
      console.log('[clerk-loader] Script carregado com sucesso. Inicializando...');
      if (typeof window.__initClerk === 'function') window.__initClerk();
    };
    script.onerror = function (err) {
      console.error('[clerk-loader] FALHA CRÍTICA: Não foi possível carregar o Clerk JS do CDN.', err);
      console.error('[clerk-loader] URL tentada:', CLERK_SRC);
    };
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadClerk);
  } else {
    loadClerk();
  }
})();

