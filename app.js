window.addEventListener('load', async () => {
  if (!window.Clerk) return;
  await window.Clerk.load();
  renderAuthArea(window.Clerk.user);
});

function renderAuthArea(user) {
  const area = document.getElementById('auth-area');
  if (!area) return;
  if (user) {
    const email = user.emailAddresses[0]?.emailAddress ?? '';
    area.innerHTML = `
      <span class="auth-email">${email}</span>
      <button class="auth-btn"
        onclick="window.Clerk.signOut().then(()=>location.reload())">
        Sair
      </button>
    `;
  } else {
    area.innerHTML = `
      <button class="auth-btn"
        onclick="window.Clerk.openSignIn()">Entrar</button>
      <button class="auth-btn auth-btn--pro"
        onclick="location.href='/checkout.html'">Seja PRO</button>
    `;
  }
}

async function getClerkToken() {
  return await window.Clerk?.session?.getToken() ?? null;
}

/* ============================================================
   PRECIFICA FÁCIL — Lógica principal (app.js)
   Taxas extraídas da planilha real do usuário
   Guideline: use Intl.NumberFormat / never hardcode formats
   ============================================================ */

'use strict';

// ================================================================
// MARKETPLACES CONFIG — fees from user's real spreadsheet
// ================================================================
const MARKETPLACES = [
  {
    id: 'shopee',
    name: 'Shopee',
    emoji: '🟠',
    color: '#ee4d2d',
    desc: 'Social commerce',
    fees: { taxaPct: 0.23, taxaFixa: 4.00, cupomPct: 0.05, comissaoPct: 0.00, antecipPct: 0.02 }
  },
  {
    id: 'mercadolivre',
    name: 'Mercado Livre',
    emoji: '🟡',
    color: '#d4b800',
    desc: 'Maior da América Latina',
    fees: { taxaPct: 0.115, taxaFixa: 18.76, cupomPct: 0.10, comissaoPct: 0.00, antecipPct: 0.00 }
  },
  {
    id: 'shein',
    name: 'Shein',
    emoji: '⚫',
    color: '#555555',
    desc: 'Moda & estilo',
    fees: { taxaPct: 0.18, taxaFixa: 4.00, cupomPct: 0.05, comissaoPct: 0.00, antecipPct: 0.00 }
  },
  {
    id: 'amazon',
    name: 'Amazon',
    emoji: '🟤',
    color: '#d68910',
    desc: 'E-commerce global',
    fees: { taxaPct: 0.16, taxaFixa: 4.90, cupomPct: 0.05, comissaoPct: 0.00, antecipPct: 0.00 }
  },
  {
    id: 'amazon_fba',
    name: 'Amazon FBA',
    emoji: '📦',
    color: '#c67c11',
    desc: 'Fulfillment by Amazon',
    fees: { taxaPct: 0.16, taxaFixa: 4.90, cupomPct: 0.00, comissaoPct: 0.015, antecipPct: 0.00 }
  },
  {
    id: 'magalu',
    name: 'Magalu',
    emoji: '🔵',
    color: '#0066cc',
    desc: 'Magazine Luiza',
    fees: { taxaPct: 0.18, taxaFixa: 3.00, cupomPct: 0.10, comissaoPct: 0.00, antecipPct: 0.00 }
  },
  {
    id: 'olist',
    name: 'Olist',
    emoji: '🟢',
    color: '#1a7a3a',
    desc: 'Multi-canal',
    fees: { taxaPct: 0.23, taxaFixa: 5.00, cupomPct: 0.05, comissaoPct: 0.01, antecipPct: 0.00 }
  },
  {
    id: 'tiktok',
    name: 'TikTok Shop',
    emoji: '🎵',
    color: '#2d8c95',
    desc: 'Social commerce viral',
    fees: { taxaPct: 0.06, taxaFixa: 2.00, cupomPct: 0.10, comissaoPct: 0.15, antecipPct: 0.00 }
  }
];

// ================================================================
// FORMATTING — Intl.NumberFormat (guideline: never hardcode)
// ================================================================
const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmt = (v) => fmtBRL.format(v);
const pct = (v) => fmtPct.format(v / 100);

// ================================================================
// T1: REGIME DEFAULTS — alíquota padrão por regime tributário
// ================================================================
const REGIME_DEFAULTS = { simples: 4, mei: 0, presumido: 12, real: 15 };

// ================================================================
// CALCULATION ENGINE
// Formula: PrecoVenda = (Custo + TaxaFixa) / (1 - TotalPct)
// Where TotalPct = all % fees + imposto + antecip + margemDesejada
// ================================================================
function calculate(custo, margemPct, impostoPct, antecipExtra, mp) {
  const F = mp.fees;
  const totalPct =
    F.taxaPct +
    F.cupomPct +
    F.comissaoPct +
    (impostoPct / 100) +
    (F.antecipPct + antecipExtra / 100) +
    (margemPct / 100);

  if (totalPct >= 1) return null;

  const precoVenda = (custo + F.taxaFixa) / (1 - totalPct);
  const cupom      = precoVenda * F.cupomPct;
  const taxaVar    = precoVenda * F.taxaPct;
  const comissao   = precoVenda * F.comissaoPct;
  const imposto    = precoVenda * (impostoPct / 100);
  const antecip    = precoVenda * (F.antecipPct + antecipExtra / 100);
  const lucro      = precoVenda * (margemPct / 100);
  const totalDed   = cupom + taxaVar + F.taxaFixa + comissao + imposto + antecip;
  const repasse    = precoVenda - totalDed;
  const margemReal = (lucro / precoVenda) * 100;

  return { precoVenda, custo, cupom, taxaVar, taxaFixa: F.taxaFixa, comissao, imposto, antecip, lucro, repasse, totalDed, margemReal };
}

// ================================================================
// UX HELPERS
// ================================================================
function qualClass(m) { return m >= 20 ? 'good' : m >= 10 ? 'warn' : 'bad'; }

// ================================================================
// RENDER HELPERS
// ================================================================
function rowHtml(dot, label, amount, cls) {
  return `
    <div class="row" role="listitem">
      <span class="row-lbl">
        <span class="row-dot" style="background:${dot}" aria-hidden="true"></span>
        ${label}
      </span>
      <span class="row-amt ${cls}" aria-label="${label}: ${amount}">${amount}</span>
    </div>`;
}

function renderCard(mp, res) {
  const inviable = !res;
  const q = inviable ? 'bad' : qualClass(res.margemReal);
  const barCost = inviable ? 0 : Math.round((res.custo / res.precoVenda) * 100);
  const barFees = inviable ? 0 : Math.round((res.totalDed / res.precoVenda) * 100);
  const barProf = inviable ? 0 : Math.max(0, 100 - barCost - barFees);

  return `
    <article class="result-card" style="--card-color:${mp.color}" aria-label="${mp.name}: ${inviable ? 'inviável' : fmt(res.precoVenda)}">
      <header class="mp-header">
        <div class="mp-badge" aria-hidden="true">${mp.emoji}</div>
        <div>
          <div class="mp-name">${mp.name}</div>
          <div class="mp-desc">${mp.desc}</div>
        </div>
      </header>

      ${inviable ? `
        <div class="inviable-box" role="alert">
          As taxas somadas ultrapassam 100% — inviável com essa margem. Reduza a margem ou reveja o custo.
        </div>
      ` : `
        <div class="price-block" aria-label="Preço de venda sugerido: ${fmt(res.precoVenda)}">
          <span class="price-lbl">Preço de venda</span>
          <span class="price-val">${fmt(res.precoVenda)}</span>
        </div>

        <div class="rows" role="list" aria-label="Composição do preço de ${mp.name}">
          ${rowHtml('#b8b0a8', 'Custo do produto', fmt(res.custo), 'muted')}
          ${res.cupom > 0 ? rowHtml('#e07070', 'Cupom / Desconto', '− ' + fmt(res.cupom), 'neg') : ''}
          ${rowHtml('#e07070', `Taxa ${mp.name}`, '− ' + fmt(res.taxaVar), 'neg')}
          ${rowHtml('#e07070', 'Taxa fixa', '− ' + fmt(res.taxaFixa), 'neg')}
          ${res.comissao > 0 ? rowHtml('#e07070', 'Comissão', '− ' + fmt(res.comissao), 'neg') : ''}
          ${rowHtml('#d4a832', 'Imposto', '− ' + fmt(res.imposto), 'neg')}
          ${res.antecip > 0 ? rowHtml('#d4a832', 'Antecipação', '− ' + fmt(res.antecip), 'neg') : ''}
          <div class="row row-total" role="listitem">
            <span class="row-lbl" style="font-weight:700;color:var(--text-2)">Lucro líquido</span>
            <span class="row-amt ${res.lucro >= 0 ? 'pos' : 'neg'}" aria-label="Lucro líquido: ${fmt(res.lucro)}">${fmt(res.lucro)}</span>
          </div>
        </div>

        <div class="margin-pill pill-${q}" aria-label="Margem de contribuição: ${pct(res.margemReal)}">
          ${q === 'good' ? '✓' : q === 'warn' ? '!' : '✕'} Margem: ${pct(res.margemReal)}
        </div>

        <div class="bar-section" aria-hidden="true">
          <div class="bar-lbl">Composição do preço</div>
          <div class="bar" title="Custo: ${barCost}% | Taxas: ${barFees}% | Lucro: ${barProf}%">
            <div class="bar-seg" style="width:${barCost}%;background:#cfc8be"></div>
            <div class="bar-seg" style="width:${barFees}%;background:#e07070"></div>
            <div class="bar-seg" style="width:${barProf}%;background:#52b788"></div>
          </div>
        </div>
      `}
    </article>`;
}

// ================================================================
// T3: DETAIL CARD (extracted for re-rendering on fee edits)
// ================================================================
function renderDetailCard(mp, res, margem) {
  if (!res) return '';
  return `
    <article class="result-card" style="--card-color:${mp.color}" aria-label="Detalhamento completo — ${mp.name}">
      <h3 style="font-size:.875rem;font-weight:700;color:var(--text-2);margin-bottom:14px;">Detalhamento Completo</h3>
      <div class="rows" role="list">
        ${rowHtml('#52b788', 'Preço de venda', fmt(res.precoVenda), 'pos')}
        ${rowHtml('#52b788', 'Repasse (o que você recebe)', fmt(res.repasse), 'pos')}
        ${rowHtml('#e07070', 'Total de deduções', fmt(res.totalDed), 'neg')}
        ${rowHtml('#52b788', 'Lucro líquido', fmt(res.lucro), 'pos')}
        <div class="row row-total" role="listitem">
          <span class="row-lbl" style="font-weight:700;color:var(--text-2)">Margem real</span>
          <span class="row-amt pill-${qualClass(res.margemReal)}">${pct(res.margemReal)}</span>
        </div>
      </div>
      <div style="margin-top:16px;padding:12px 14px;background:var(--accent-bg);border-radius:var(--r-md);font-size:.82rem;color:var(--text-2);line-height:1.65;border-left:3px solid var(--accent-mid)">
        <strong>Como usar:</strong> Venda por <strong>${fmt(res.precoVenda)}</strong> para garantir ${pct(margem)} de margem sobre as taxas da plataforma.
        ${res.cupom > 0 ? `<br>Dica: com cupom, considere subir o preço anunciado em ${pct(mp.fees.cupomPct * 100)} para manter a margem.` : ''}
      </div>
    </article>`;
}

// ================================================================
// T3: EDITABLE FEES for individual marketplace panels
// ================================================================
function renderEditableFields(mp) {
  const F = mp.fees;
  const fields = [
    { key: 'cupomPct', label: 'Cupom / Desconto', value: (F.cupomPct * 100).toFixed(1), suffix: '%' },
    { key: 'taxaPct', label: 'Taxa ' + mp.name, value: (F.taxaPct * 100).toFixed(1), suffix: '%' },
    { key: 'taxaFixa', label: 'Taxa fixa', value: F.taxaFixa.toFixed(2), suffix: 'R$' },
    { key: 'comissaoPct', label: 'Comissão', value: (F.comissaoPct * 100).toFixed(1), suffix: '%' },
    { key: 'antecipPct', label: 'Antecipação', value: (F.antecipPct * 100).toFixed(1), suffix: '%' },
  ];

  const isPro = isSubscribed();

  return `
    <div class="editable-fees-wrapper ${isPro ? '' : 'pro-locked'}">
      <div class="editable-fees" data-mp="${mp.id}">
        <h4 class="edit-fees-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Ajustar taxas
        </h4>
        ${fields.map(f => `
          <div class="edit-fee-row">
            <label class="edit-fee-label">${f.label}</label>
            <div class="edit-fee-input-wrap">
              <input type="number" class="edit-fee-input"
                data-mp="${mp.id}" data-key="${f.key}"
                value="${f.value}" step="0.1" min="0"
                aria-label="${f.label} para ${mp.name}"
                ${isPro ? '' : 'tabindex="-1"'} />
              <span class="edit-fee-suffix">${f.suffix}</span>
            </div>
          </div>
        `).join('')}
        <button type="button" class="reset-fees-btn" data-mp="${mp.id}"
          aria-label="Restaurar taxas padrão de ${mp.name}" ${isPro ? '' : 'tabindex="-1"'}>
          ↺ Restaurar padrões
        </button>
      </div>
      ${isPro ? '' : `
        <div class="pro-overlay" role="button" tabindex="0" aria-label="Desbloquear edição de taxas"
          onclick="requirePro('Edição de taxas')" onkeydown="if(event.key==='Enter')requirePro('Edição de taxas')">
          <div class="pro-overlay-content">
            <span class="pro-overlay-icon" aria-hidden="true">🔒</span>
            <span class="pro-overlay-text">Recurso PRO</span>
            <span class="pro-overlay-btn-text">Clique para desbloquear</span>
          </div>
        </div>
      `}
    </div>`;
}

// ================================================================
// STORE LAST CALC PARAMS — needed for T3 per-marketplace recalc
// ================================================================
let lastCalcParams = null;

// ================================================================
// RENDER RESULTS (T3: containers + T4: profile filter)
// ================================================================
function renderResults(custo, margem, impostoPct, antecipExtra) {
  lastCalcParams = { custo, margem, impostoPct, antecipExtra };

  // T4: filter by profile + apply profile discounts
  const activeMPs = getActiveMarketplaces(MARKETPLACES);
  const data = activeMPs.map(mp => {
    const profileDiscount = getProfileDiscount(mp.id);
    let effectiveMp = mp;
    if (profileDiscount !== null) {
      effectiveMp = {
        ...mp,
        fees: { ...mp.fees, cupomPct: profileDiscount / 100 }
      };
    }
    return {
      mp: effectiveMp,
      originalMp: mp,
      res: calculate(custo, margem, impostoPct, antecipExtra, effectiveMp)
    };
  });

  // Update summary text
  document.getElementById('res-custo').textContent = fmt(custo);
  document.getElementById('res-margem').textContent = pct(margem);

  // Overview chips
  const strip = document.getElementById('overview-strip');
  strip.innerHTML = data.map(({ mp, res }) => {
    const q = res ? qualClass(res.margemReal) : 'bad';
    return `
      <button
        type="button"
        class="overview-chip overview-chip--${q}"
        onclick="switchTab('${mp.id}')"
        aria-label="${mp.name}: ${res ? fmt(res.precoVenda) : 'inviável'}"
        role="listitem"
      >
        <span class="chip-icon" aria-hidden="true">${mp.emoji}</span>
        <span class="chip-info">
          <span class="chip-name">${mp.name}</span>
          <span class="chip-price">${res ? fmt(res.precoVenda) : 'Inviável'}</span>
        </span>
      </button>`;
  }).join('');

  // Tab nav & panels
  const tabList = [{ id: 'todos', name: 'Todos', emoji: '⚡' }, ...activeMPs];
  const nav = document.getElementById('tab-nav');
  nav.innerHTML = tabList.map((mp, i) => `
    <button
      type="button"
      class="tab-btn"
      id="tab-${mp.id}"
      role="tab"
      aria-selected="${i === 0}"
      aria-controls="panel-${mp.id}"
      onclick="switchTab('${mp.id}')"
    >
      <span class="tab-icon" aria-hidden="true">${mp.emoji}</span>
      ${mp.name}
    </button>
  `).join('');

  // Panels
  const panels = document.getElementById('tab-panels');

  // "Todos" panel
  const todosCards = data.map(({ mp, res }) => renderCard(mp, res)).join('');
  const todosPanel = `
    <div class="tab-panel" id="panel-todos" role="tabpanel" aria-labelledby="tab-todos" aria-hidden="false">
      ${todosCards}
    </div>`;

  // Individual panels (T3: card + detail + editable fees)
  const individualPanels = data.map(({ mp, res }) => `
    <div class="tab-panel" id="panel-${mp.id}" role="tabpanel" aria-labelledby="tab-${mp.id}" aria-hidden="true">
      <div class="mp-card-container">${renderCard(mp, res)}</div>
      ${res ? `<div class="mp-detail-container">${renderDetailCard(mp, res, margem)}</div>` : ''}
      <div class="mp-edit-container">${renderEditableFields(mp)}</div>
    </div>`).join('');

  panels.innerHTML = todosPanel + individualPanels;
  activeTab = 'todos';
}

// ================================================================
// TAB SWITCHING
// ================================================================
let activeTab = 'todos';

window.switchTab = function(id) {
  activeTab = id;

  document.querySelectorAll('.tab-btn').forEach(b => {
    const sel = b.id === `tab-${id}`;
    b.setAttribute('aria-selected', sel);
  });

  document.querySelectorAll('.tab-panel').forEach(p => {
    const isActive = p.id === `panel-${id}`;
    p.setAttribute('aria-hidden', !isActive);
  });

  // Scroll to tab panel smoothly
  const panel = document.getElementById(`panel-${id}`);
  if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

// ================================================================
// T2: MARGIN SYNC — simplified (no slider)
// ================================================================
const margemInput = document.getElementById('margem');
const chips       = document.querySelectorAll('.chip');

function setMargem(val) {
  const v = Math.min(80, Math.max(0, parseFloat(val) || 0));
  margemInput.value = v;

  // Update chip states
  chips.forEach(c => {
    const isActive = parseFloat(c.dataset.val) === v;
    c.classList.toggle('chip--active', isActive);
    c.setAttribute('aria-pressed', isActive);
  });
}

margemInput.addEventListener('input', () => setMargem(margemInput.value));
chips.forEach(c => c.addEventListener('click', () => setMargem(c.dataset.val)));

// Init
setMargem(20);

// ================================================================
// T1: REGIME → ALÍQUOTA auto-fill
// ================================================================
const regimeSelect = document.getElementById('regime');
const impostoInput = document.getElementById('imposto');

regimeSelect.addEventListener('change', () => {
  impostoInput.value = REGIME_DEFAULTS[regimeSelect.value];
});

// ================================================================
// T3: EVENT DELEGATION — editable fees recalc
// ================================================================
const tabPanelsEl = document.getElementById('tab-panels');

tabPanelsEl.addEventListener('input', function(e) {
  if (!e.target.classList.contains('edit-fee-input')) return;
  recalcSingleMarketplace(e.target.dataset.mp);
});

tabPanelsEl.addEventListener('click', function(e) {
  const btn = e.target.closest('.reset-fees-btn');
  if (!btn) return;
  resetMarketplaceFees(btn.dataset.mp);
});

/**
 * Recalculates a single marketplace based on its editable fee inputs
 */
function recalcSingleMarketplace(mpId) {
  if (!lastCalcParams) return;
  const mp = MARKETPLACES.find(m => m.id === mpId);
  if (!mp) return;

  const panel = document.getElementById('panel-' + mpId);
  if (!panel) return;

  // Read overridden fees from inputs
  const inputs = panel.querySelectorAll('.edit-fee-input');
  const overriddenFees = {};
  // Start with original fees
  Object.keys(mp.fees).forEach(k => { overriddenFees[k] = mp.fees[k]; });

  inputs.forEach(inp => {
    const key = inp.dataset.key;
    const val = parseFloat(inp.value) || 0;
    if (key === 'taxaFixa') {
      overriddenFees[key] = val;
    } else {
      overriddenFees[key] = val / 100; // Convert % to decimal
    }
  });

  const tempMp = { id: mp.id, name: mp.name, emoji: mp.emoji, color: mp.color, desc: mp.desc, fees: overriddenFees };
  const { custo, margem, impostoPct, antecipExtra } = lastCalcParams;
  const res = calculate(custo, margem, impostoPct, antecipExtra, tempMp);

  // Re-render card and detail (not the editable fields)
  const cardContainer = panel.querySelector('.mp-card-container');
  const detailContainer = panel.querySelector('.mp-detail-container');

  if (cardContainer) cardContainer.innerHTML = renderCard(tempMp, res);
  if (detailContainer) {
    detailContainer.innerHTML = renderDetailCard(tempMp, res, margem);
  } else if (res) {
    // Create detail container if it didn't exist (was inviable before)
    const editContainer = panel.querySelector('.mp-edit-container');
    const newDetail = document.createElement('div');
    newDetail.className = 'mp-detail-container';
    newDetail.innerHTML = renderDetailCard(tempMp, res, margem);
    panel.insertBefore(newDetail, editContainer);
  }
}

/**
 * Resets marketplace fees back to original config values
 */
function resetMarketplaceFees(mpId) {
  const mp = MARKETPLACES.find(m => m.id === mpId);
  if (!mp) return;

  const panel = document.getElementById('panel-' + mpId);
  if (!panel) return;

  const inputs = panel.querySelectorAll('.edit-fee-input');
  inputs.forEach(inp => {
    const key = inp.dataset.key;
    if (key === 'taxaFixa') {
      inp.value = mp.fees[key].toFixed(2);
    } else {
      inp.value = (mp.fees[key] * 100).toFixed(1);
    }
  });

  recalcSingleMarketplace(mpId);
}

// ================================================================
// CALCULATE — main handler
// ================================================================
const custoInput  = document.getElementById('custo');
const custoShell  = document.getElementById('custo-shell');
const custoError  = document.getElementById('custo-error');
const calcBtn     = document.getElementById('calcular-btn');

function showError(msg) {
  custoError.textContent = msg;
  custoShell.classList.add('has-error');
  custoInput.focus();
}
function clearError() {
  custoError.textContent = '';
  custoShell.classList.remove('has-error');
}

function doCalc() {
  clearError();
  const custo       = parseFloat(custoInput.value);
  const margem      = parseFloat(margemInput.value) || 0;
  const impostoPct  = parseFloat(document.getElementById('imposto').value) || 0;
  const antecipExtra= parseFloat(document.getElementById('antecipacao').value) || 0;

  if (!custo || custo <= 0) {
    showError('Informe um custo válido maior que R$ 0,00.');
    return;
  }

  renderResults(custo, margem, impostoPct, antecipExtra);

  const section = document.getElementById('results-section');
  section.hidden = false;
  // Scroll into view after paint
  requestAnimationFrame(() => {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

calcBtn.addEventListener('click', doCalc);

// Enter key on input-card inputs triggers calc
document.querySelectorAll('.input-card input, .input-card select').forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') doCalc(); });
});

// ================================================================
// T4: PROFILE MODAL HANDLERS
// ================================================================
document.getElementById('profile-btn').addEventListener('click', () => {
  if (!requirePro('Configurações de perfil')) return;
  openProfileModal(MARKETPLACES);
});

document.getElementById('profile-close').addEventListener('click', closeProfileModal);

document.getElementById('profile-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'profile-overlay') closeProfileModal();
});

document.getElementById('profile-save').addEventListener('click', () => {
  const data = getProfileFromForm();
  saveProfileData(data);
  closeProfileModal();

  // Se resultados estão visíveis, recalcula com novo perfil
  if (!document.getElementById('results-section').hidden) {
    doCalc();
  }
});

document.getElementById('profile-reset').addEventListener('click', () => {
  clearProfile();
  renderProfileBody(MARKETPLACES);
});

// Escape para fechar modais
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const profileOverlay = document.getElementById('profile-overlay');
    if (profileOverlay.classList.contains('modal--visible')) {
      closeProfileModal();
    }
  }
});
