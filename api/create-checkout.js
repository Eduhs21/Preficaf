/* ============================================================
   PRECIFICA FÁCIL — API: Criar Sessão de Checkout Stripe
   POST /api/create-checkout
   Body: { plan: 'monthly' | 'annual' }
   Header: Authorization: Bearer <clerk_jwt>
   ============================================================ */

import { createClerkClient } from '@clerk/backend';
import Stripe from 'stripe';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_MAP = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  annual: process.env.STRIPE_PRICE_ANNUAL
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://precificafacil.vercel.app';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    // Extrair token JWT do header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }

    const token = authHeader.split(' ')[1];

    // Validar token com Clerk
    let payload;
    try {
      payload = await clerk.verifyToken(token);
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    const userId = payload.sub;

    // Validar plano
    const { plan } = req.body || {};
    if (!plan || !PRICE_MAP[plan]) {
      return res.status(400).json({ error: 'Plano inválido. Use "monthly" ou "annual".' });
    }

    const priceId = PRICE_MAP[plan];
    if (!priceId) {
      return res.status(500).json({ error: 'Price ID não configurado para este plano.' });
    }

    // Buscar email do usuário no Clerk
    let userEmail = '';
    try {
      const user = await clerk.users.getUser(userId);
      userEmail = user.emailAddresses?.[0]?.emailAddress || '';
    } catch (e) {
      // Continua sem email (não é crítico)
    }

    // Criar sessão de checkout no Stripe
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/checkout.html?success=true`,
      cancel_url: `${APP_URL}/checkout.html`,
      client_reference_id: userId,
      customer_email: userEmail || undefined,
      metadata: {
        userId,
        plan
      },
      subscription_data: {
        metadata: {
          userId,
          plan
        }
      }
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('[create-checkout] Erro:', err);
    return res.status(500).json({ error: 'Erro ao criar sessão de pagamento' });
  }
}
