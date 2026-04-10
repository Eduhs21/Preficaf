/* ============================================================
   PRECIFICA FÁCIL — Módulo de Autenticação (auth.js)
   Gerencia status PRO/Free e paywall
   ============================================================ */

'use strict';

const AUTH_KEY = 'precifica_auth';

/**
 * Verifica se o usuário tem assinatura PRO ativa
 * @returns {boolean}
 */
function isSubscribed() {
  const user = getUser();
  if (!user) return false;
  if (user.validUntil && new Date(user.validUntil) < new Date()) return false;
  return user.plan === 'monthly' || user.plan === 'yearly';
}

/**
 * Retorna dados do usuário do localStorage
 * @returns {Object|null} { email, plan, validUntil }
 */
function getUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Salva dados do usuário no localStorage
 * @param {Object} data - { email, plan, validUntil }
 */
function setUser(data) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
}

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
// Verifica ativação vinda do redirect de checkout
// ================================================================
(function checkActivation() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('activated') === 'true') {
    const plan = params.get('plan') || 'monthly';
    const email = params.get('email') || '';
    const now = new Date();
    let validUntil;

    if (plan === 'yearly') {
      validUntil = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    } else {
      validUntil = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }

    setUser({ email, plan, validUntil: validUntil.toISOString() });

    // Limpa os parâmetros de URL
    window.history.replaceState({}, '', window.location.pathname);
  }
})();

// ================================================================
// Handlers do paywall (fechar)
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('paywall-close');
  const overlay = document.getElementById('paywall-overlay');

  if (closeBtn) {
    closeBtn.addEventListener('click', hidePaywall);
  }

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) hidePaywall();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay && overlay.classList.contains('paywall--visible')) {
      hidePaywall();
    }
  });
});
