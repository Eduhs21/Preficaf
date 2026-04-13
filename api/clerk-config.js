/* ============================================================
   PRECIFICA FÁCIL — API: Clerk Config
   GET /api/clerk-config
   Retorna a publishable key para o frontend carregar o Clerk.
   ============================================================ */

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const publishableKey =
    process.env.CLERK_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    '';

  if (!publishableKey) {
    return res.status(500).json({ error: 'CLERK_PUBLISHABLE_KEY não configurada' });
  }

  return res.status(200).json({ publishableKey });
}

