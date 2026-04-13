/* ============================================================
   Build script — Injeta variáveis de ambiente públicas
   Roda automaticamente no build da Vercel via "buildCommand"
   Gera o arquivo /env-config.js com a publishable key
   ============================================================ */

const fs = require('fs');
const path = require('path');

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

const output = `/* Auto-generated at build time — DO NOT EDIT */
window.__ENV__ = {
  CLERK_PUBLISHABLE_KEY: "${publishableKey}",
  APP_URL: "${appUrl}"
};
`;

const outPath = path.join(__dirname, '..', 'env-config.js');
fs.writeFileSync(outPath, output, 'utf-8');

console.log('[inject-env] ✅ env-config.js gerado com sucesso');
console.log('[inject-env]    CLERK_PUBLISHABLE_KEY:', publishableKey ? publishableKey.substring(0, 12) + '...' : '(vazio)');
console.log('[inject-env]    APP_URL:', appUrl || '(vazio)');
