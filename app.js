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
// RENDER RESULTS
// ================================================================
function renderResults(custo, margem, impostoPct, antecipExtra) {
  const data = MARKETPLACES.map(mp => ({ mp, res: calculate(custo, margem, impostoPct, antecipExtra, mp) }));

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
  const tabList = [{ id: 'todos', name: 'Todos', emoji: '⚡' }, ...MARKETPLACES];
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

  // Individual panels (two-col: card + detail)
  const individualPanels = data.map(({ mp, res }) => `
    <div class="tab-panel" id="panel-${mp.id}" role="tabpanel" aria-labelledby="tab-${mp.id}" aria-hidden="true">
      ${renderCard(mp, res)}
      ${res ? `
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
      </article>` : ''}
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
// SLIDER ↔ INPUT SYNC
// ================================================================
const margemInput = document.getElementById('margem');
const slider      = document.getElementById('margem-slider');
const sliderVal   = document.getElementById('slider-val');
const chips       = document.querySelectorAll('.chip');

function setMargem(val) {
  const v = Math.min(80, Math.max(0, parseFloat(val) || 0));
  margemInput.value = v;
  slider.value = v;
  sliderVal.textContent = v + '%';

  // Update slider track fill via inline style
  const pctFill = (v / 80) * 100;
  slider.style.background = `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pctFill}%, var(--border) ${pctFill}%, var(--border) 100%)`;

  // Update chip states
  chips.forEach(c => {
    const isActive = parseFloat(c.dataset.val) === v;
    c.classList.toggle('chip--active', isActive);
    c.setAttribute('aria-pressed', isActive);
  });
}

slider.addEventListener('input', () => setMargem(slider.value));
margemInput.addEventListener('input', () => setMargem(margemInput.value));
chips.forEach(c => c.addEventListener('click', () => setMargem(c.dataset.val)));

// Init
setMargem(20);

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

// Enter key on any input triggers calc
document.querySelectorAll('input, select').forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') doCalc(); });
});
