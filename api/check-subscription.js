/* ============================================================
   PRECIFICA FÁCIL — API: Verificação de Assinatura
   GET /api/check-subscription
   Header: Authorization: Bearer <clerk_jwt>
   ============================================================ */

import { createClerkClient } from '@clerk/backend';
import { sql } from '@vercel/postgres';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

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

    // Buscar assinatura ativa no Postgres
    const { rows } = await sql`
      SELECT plan, status, valid_until
      FROM subscriptions
      WHERE user_id = ${userId}
        AND status = 'active'
        AND valid_until > NOW()
      LIMIT 1
    `;

    if (rows.length > 0) {
      return res.status(200).json({
        isPro: true,
        plan: rows[0].plan,
        validUntil: rows[0].valid_until
      });
    }

    return res.status(200).json({
      isPro: false,
      plan: null,
      validUntil: null
    });

  } catch (err) {
    console.error('[check-subscription] Erro:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
