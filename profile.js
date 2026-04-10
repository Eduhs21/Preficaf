/* ============================================================
   PRECIFICA FÁCIL — Módulo de Perfil (profile.js)
   Gerencia preferências de marketplaces no localStorage
   ============================================================ */

'use strict';

const PROFILE_KEY = 'precifica_perfil';

/**
 * Carrega perfil do localStorage
 * @returns {Object|null} { marketplaces: string[], discounts: { [mpId]: number } }
 */
function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Salva perfil no localStorage
 * @param {Object} data - { marketplaces, discounts }
 */
function saveProfileData(data) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
}

/**
 * Limpa perfil do localStorage
 */
function clearProfile() {
  localStorage.removeItem(PROFILE_KEY);
}

/**
 * Renderiza o corpo do modal de perfil com checkboxes e inputs de desconto
 * @param {Array} marketplaces - lista de MARKETPLACES
 */
function renderProfileBody(marketplaces) {
  const profile = loadProfile();
  const body = document.getElementById('profile-body');

  body.innerHTML =
    '<p class="profile-desc">Selecione os marketplaces que você utiliza e configure o desconto habitual de cada um.</p>' +
    '<div class="profile-list">' +
    marketplaces.map(function(mp) {
      var checked = profile ? profile.marketplaces.includes(mp.id) : true;
      var discount = (profile && profile.discounts && profile.discounts[mp.id] != null)
        ? profile.discounts[mp.id]
        : (mp.fees.cupomPct * 100);

      return '<div class="profile-item ' + (checked ? '' : 'profile-item--disabled') + '">' +
        '<label class="profile-check-label">' +
          '<input type="checkbox" class="profile-check" data-mp="' + mp.id + '" ' + (checked ? 'checked' : '') + ' />' +
          '<span class="profile-mp-icon" aria-hidden="true">' + mp.emoji + '</span>' +
          '<span class="profile-mp-name">' + mp.name + '</span>' +
        '</label>' +
        '<div class="profile-discount-wrap">' +
          '<span class="profile-discount-label">Desconto</span>' +
          '<div class="profile-discount-input-wrap">' +
            '<input type="number" class="profile-discount-input" id="pdiscount-' + mp.id + '" ' +
              'data-mp="' + mp.id + '" value="' + discount.toFixed(1) + '" step="0.5" min="0" max="50" ' +
              'aria-label="Desconto habitual para ' + mp.name + '" />' +
            '<span class="profile-discount-suffix">%</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('') +
    '</div>';

  // Toggle visual disabled state on checkbox change
  body.querySelectorAll('.profile-check').forEach(function(check) {
    check.addEventListener('change', function() {
      var item = check.closest('.profile-item');
      item.classList.toggle('profile-item--disabled', !check.checked);
    });
  });
}

/**
 * Lê os dados atuais do formulário de perfil
 * @returns {Object} { marketplaces: string[], discounts: { [mpId]: number } }
 */
function getProfileFromForm() {
  var checks = document.querySelectorAll('.profile-check');
  var discountInputs = document.querySelectorAll('.profile-discount-input');

  var marketplaces = [];
  checks.forEach(function(c) {
    if (c.checked) marketplaces.push(c.dataset.mp);
  });

  var discounts = {};
  discountInputs.forEach(function(i) {
    discounts[i.dataset.mp] = parseFloat(i.value) || 0;
  });

  return { marketplaces: marketplaces, discounts: discounts };
}

/**
 * Filtra marketplaces pelo perfil salvo
 * Se nenhum perfil salvo, retorna todos
 * @param {Array} allMarketplaces
 * @returns {Array}
 */
function getActiveMarketplaces(allMarketplaces) {
  var profile = loadProfile();
  if (!profile || !profile.marketplaces || profile.marketplaces.length === 0) {
    return allMarketplaces;
  }
  return allMarketplaces.filter(function(mp) {
    return profile.marketplaces.includes(mp.id);
  });
}

/**
 * Retorna o desconto configurado no perfil para um marketplace
 * @param {string} mpId
 * @returns {number|null} desconto em %, ou null se não configurado
 */
function getProfileDiscount(mpId) {
  var profile = loadProfile();
  if (!profile || !profile.discounts) return null;
  return profile.discounts[mpId] != null ? profile.discounts[mpId] : null;
}

/**
 * Abre o modal de perfil
 * @param {Array} marketplaces
 */
function openProfileModal(marketplaces) {
  renderProfileBody(marketplaces);
  var overlay = document.getElementById('profile-overlay');
  overlay.setAttribute('aria-hidden', 'false');
  overlay.classList.add('modal--visible');
  document.body.style.overflow = 'hidden';

  // Focus primeiro elemento interativo
  var firstCheck = overlay.querySelector('.profile-check');
  if (firstCheck) setTimeout(function() { firstCheck.focus(); }, 100);
}

/**
 * Fecha o modal de perfil
 */
function closeProfileModal() {
  var overlay = document.getElementById('profile-overlay');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.classList.remove('modal--visible');
  document.body.style.overflow = '';
}
