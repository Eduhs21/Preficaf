/* ============================================================
   PRECIFICA FÁCIL — API: Webhook do Stripe
   POST /api/stripe-webhook
   Processa eventos de checkout e cancelamento
   ============================================================ */

import Stripe from 'stripe';
import { sql } from '@vercel/postgres';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Desabilitar body parsing do Vercel (precisa do raw body)
export const config = {
  api: {
    bodyParser: false
  }
};

/**
 * Lê o raw body do request (necessário para validação de webhook)
 */
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  let event;

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'];

    if (!signature || !endpointSecret) {
      return res.status(400).json({ error: 'Assinatura do webhook ausente' });
    }

    event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
  } catch (err) {
    console.error('[stripe-webhook] Erro de verificação:', err.message);
    return res.status(400).json({ error: `Webhook inválido: ${err.message}` });
  }

  try {
    switch (event.type) {

      // ============================================================
      // Checkout concluído — ativar assinatura
      // ============================================================
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.userId;
        const plan = session.metadata?.plan || 'monthly';

        if (!userId) {
          console.error('[stripe-webhook] checkout.session.completed sem userId');
          return res.status(400).json({ error: 'userId ausente na sessão' });
        }

        // Calcular valid_until baseado no plano
        const now = new Date();
        let validUntil;
        if (plan === 'annual') {
          validUntil = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        } else {
          validUntil = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        }

        // UPSERT: insere ou atualiza assinatura existente
        await sql`
          INSERT INTO subscriptions (user_id, plan, status, valid_until, stripe_session_id, created_at, updated_at)
          VALUES (${userId}, ${plan}, 'active', ${validUntil.toISOString()}, ${session.id}, NOW(), NOW())
          ON CONFLICT (user_id)
          DO UPDATE SET
            plan = ${plan},
            status = 'active',
            valid_until = ${validUntil.toISOString()},
            stripe_session_id = ${session.id},
            updated_at = NOW()
        `;

        console.log(`[stripe-webhook] Assinatura ativada: userId=${userId}, plan=${plan}, validUntil=${validUntil.toISOString()}`);
        break;
      }

      // ============================================================
      // Assinatura cancelada — desativar
      // ============================================================
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (!userId) {
          console.warn('[stripe-webhook] customer.subscription.deleted sem userId nos metadados');
          return res.status(200).json({ received: true, warning: 'userId não encontrado' });
        }

        await sql`
          UPDATE subscriptions
          SET status = 'canceled', updated_at = NOW()
          WHERE user_id = ${userId}
        `;

        console.log(`[stripe-webhook] Assinatura cancelada: userId=${userId}`);
        break;
      }

      default:
        // Ignorar eventos não tratados
        console.log(`[stripe-webhook] Evento ignorado: ${event.type}`);
    }

    return res.status(200).json({ received: true });

  } catch (err) {
    console.error('[stripe-webhook] Erro ao processar evento:', err);
    return res.status(500).json({ error: 'Erro ao processar webhook' });
  }
}
