/* ============================================================
   PRECIFICA FÁCIL — Módulo de Autenticação (auth.js)
   Integração com Clerk CDN + verificação de assinatura via API
   ============================================================ */

'use strict';

// ================================================================
// SUBSCRIPTION CACHE — evita requests a cada interação (5 min TTL)
// ================================================================
const SUB_CACHE_KEY = 'precifica_sub_cache';
const SUB_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Lê o cache de assinatura do sessionStorage
 * @returns {{ isPro: boolean, plan: string|null, validUntil: string|null } | null}
 */
function getCachedSubscription() {
  try {
    const raw = sessionStorage.getItem(SUB_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached._ts > SUB_CACHE_TTL) {
      sessionStorage.removeItem(SUB_CACHE_KEY);
      return null;
    }
    return cached;
  } catch (e) {
    return null;
  }
}

/**
 * Salva o resultado de assinatura no cache
 * @param {Object} data - { isPro, plan, validUntil }
 */
function setCachedSubscription(data) {
  try {
    sessionStorage.setItem(SUB_CACHE_KEY, JSON.stringify({ ...data, _ts: Date.now() }));
  } catch (e) {
    // Silently ignore
  }
}

/**
 * Limpa o cache de assinatura
 */
function clearSubscriptionCache() {
  sessionStorage.removeItem(SUB_CACHE_KEY);
}

// ================================================================
// SUBSCRIPTION CHECK — consulta backend com JWT do Clerk
// ================================================================

/**
 * Verifica se o usuário logado é PRO (async, com cache)
 * @returns {Promise<boolean>}
 */
async function checkSubscriptionAsync() {
  // Sem usuário logado → não é PRO
  if (!window.Clerk || !window.Clerk.user) return false;

  // Verificar cache primeiro
  const cached = getCachedSubscription();
  if (cached !== null) return cached.isPro;

  try {
    const token = await window.Clerk.session.getToken();
    if (!token) return false;

    const res = await fetch('/api/check-subscription', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!res.ok) {
      console.warn('[auth] Falha ao verificar assinatura:', res.status);
      return false;
    }

    const data = await res.json();
    setCachedSubscription(data);
    return data.isPro;
  } catch (err) {
    console.error('[auth] Erro ao verificar assinatura:', err);
    return false;
  }
}

// ================================================================
// SYNCHRONOUS isSubscribed() — usa cache para manter compat
// ================================================================

/** @type {boolean} */
let _isProCached = false;

/**
 * Verifica se o usuário é PRO (síncrono, via cache)
 * Usado por renderEditableFields() e outros pontos síncronos
 * @returns {boolean}
 */
function isSubscribed() {
  const cached = getCachedSubscription();
  if (cached !== null) return cached.isPro;
  return _isProCached;
}

/**
 * Força refresh do status PRO e atualiza o cache interno
 * @returns {Promise<boolean>}
 */
async function refreshProStatus() {
  clearSubscriptionCache();
  const isPro = await checkSubscriptionAsync();
  _isProCached = isPro;
  return isPro;
}

// ================================================================
// AUTH UI — Renderiza botões de login/logout no header
// ================================================================

/**
 * Renderiza a área de autenticação no header
 */
function renderAuthArea() {
  const area = document.getElementById('auth-area');
  if (!area) return;

  if (!window.Clerk) {
    area.innerHTML = '';
    return;
  }

  const user = window.Clerk.user;

  if (user) {
    // Logado: exibir email + botão sair
    const email = user.primaryEmailAddress?.emailAddress || user.firstName || 'Usuário';
    const displayName = email.length > 20 ? email.substring(0, 18) + '…' : email;

    area.innerHTML =
      '<span class="auth-email" title="' + email + '">' + displayName + '</span>' +
      '<button type="button" class="auth-btn auth-btn--logout" id="auth-logout-btn" aria-label="Sair da conta">' +
        'Sair' +
      '</button>';

    document.getElementById('auth-logout-btn').addEventListener('click', function() {
      clearSubscriptionCache();
      _isProCached = false;
      window.Clerk.signOut().then(function() {
        window.location.reload();
      });
    });

  } else {
    // Deslogado: exibir botões entrar + seja PRO
    area.innerHTML =
      '<button type="button" class="auth-btn auth-btn--login" id="auth-login-btn" aria-label="Entrar na conta">' +
        'Entrar' +
      '</button>' +
      '<a href="checkout.html" class="auth-btn auth-btn--pro" aria-label="Assinar plano PRO">' +
        'Seja PRO' +
      '</a>';

    document.getElementById('auth-login-btn').addEventListener('click', function() {
      window.Clerk.openSignIn();
    });
  }
}

// ================================================================
// PAYWALL — overlay para features premium
// ================================================================

/**
 * Mostra o overlay de paywall com o nome da feature
 * @param {string} featureName
 */
function showPaywall(featureName) {
  const overlay = document.getElementById('paywall-overlay');
  const featureEl = document.getElementById('paywall-feature');
  if (featureEl) featureEl.textContent = featureName;
  if (overlay) {
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('paywall--visible');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Esconde o overlay de paywall
 */
function hidePaywall() {
  const overlay = document.getElementById('paywall-overlay');
  if (overlay) {
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('paywall--visible');
    document.body.style.overflow = '';
  }
}

/**
 * Verifica se PRO; se não for, mostra paywall
 * @param {string} featureName
 * @returns {boolean} true se já é PRO
 */
function requirePro(featureName) {
  if (isSubscribed()) return true;
  showPaywall(featureName);
  return false;
}

// ================================================================
// PAYWALL EVENT HANDLERS (fechar)
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
  var closeBtn = document.getElementById('paywall-close');
  var overlay = document.getElementById('paywall-overlay');

  if (closeBtn) {
    closeBtn.addEventListener('click', hidePaywall);
  }

  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) hidePaywall();
    });
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay && overlay.classList.contains('paywall--visible')) {
      hidePaywall();
    }
  });
});

// ================================================================
// CLERK INITIALIZATION
// ================================================================
let _clerkInitStarted = false;

async function initClerkOnce() {
  if (_clerkInitStarted) return;
  if (!window.Clerk) return;
  _clerkInitStarted = true;

  try {
    await window.Clerk.load();

    // Renderizar UI de auth no header
    renderAuthArea();

    // Se logado, verificar status PRO em background
    if (window.Clerk.user) {
      refreshProStatus();
    }

    // Listener para mudanças de estado de autenticação
    window.Clerk.addListener(function() {
      renderAuthArea();
      if (window.Clerk.user) {
        refreshProStatus();
      } else {
        clearSubscriptionCache();
        _isProCached = false;
      }
    });
  } catch (err) {
    _clerkInitStarted = false;
    console.error('[auth] Erro ao inicializar Clerk:', err);
  }
}

// Exposto para o loader (clerk-loader.js) chamar assim que o script terminar de carregar
window.__initClerk = function () {
  initClerkOnce();
};

// Fallback: caso o Clerk demore para aparecer (script async / rede lenta)
window.addEventListener('load', function () {
  initClerkOnce();

  let tries = 0;
  const maxTries = 40; // ~10s
  const timer = setInterval(function () {
    tries += 1;
    initClerkOnce();
    if (_clerkInitStarted || tries >= maxTries) clearInterval(timer);
  }, 250);
});