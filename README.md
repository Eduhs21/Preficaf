# PrecificaFácil — Calculadora de Marketplaces

Calculadora de precificação para marketplaces brasileiros: **Shopee, Mercado Livre, Shein, Amazon, Amazon FBA, Magalu, Olist e TikTok Shop**.

## 🧠 Cursor (Rules for AI)

Este repositório inclui um arquivo `.cursorrules` na raiz com o prompt/regras do projeto para o Cursor.

- No Cursor: **Settings → Rules for AI** (ou use automaticamente via `.cursorrules`)
- Referência: veja `.cursorrules`

## ✨ Funcionalidades

- Calcule o **preço de venda ideal** a partir do custo e margem desejada
- Visualize o **breakdown completo** de taxas, impostos e lucro por plataforma
- Suporte a **Simples Nacional, MEI e Lucro Presumido**
- **Antecipação de recebíveis** configurável
- Atalhos rápidos de margem (10% — 50%)
- Design **minimalista e acessível** (WCAG-compliant)

## 🚀 Deploy

Este projeto é um site estático puro (HTML + CSS + JS). Nenhuma dependência ou build step necessário.

### Vercel (recomendado)

```bash
# Instale a Vercel CLI
npm install -g vercel

# Faça login
vercel login

# Deploy
cd calculadora-marketplace
vercel --prod
```

Ou importe diretamente em [vercel.com/new](https://vercel.com/new) apontando para este repositório.

## 📁 Estrutura

```
calculadora-marketplace/
├── index.html      # Estrutura e marcação
├── style.css       # Design system (minimalista humanizado)
├── app.js          # Lógica de cálculo e interatividade
├── vercel.json     # Configuração Vercel (cache, headers de segurança)
└── README.md       # Este arquivo
```

## 🧮 Fórmula de Cálculo

```
Preço de Venda = (Custo + Taxa Fixa) / (1 − TotalPorcentagens)

TotalPorcentagens = taxa_marketplace + cupom + comissão + imposto + antecipação + margem_desejada
```

## 🏪 Taxas por Marketplace (base)

| Marketplace    | Taxa %  | Taxa Fixa | Cupom  | Comissão |
|----------------|---------|-----------|--------|----------|
| Shopee         | 23%     | R$ 4,00   | 5%     | —        |
| Mercado Livre  | 11,5%   | R$ 18,76  | 10%    | —        |
| Shein          | 18%     | R$ 4,00   | 5%     | —        |
| Amazon         | 16%     | R$ 4,90   | 5%     | —        |
| Amazon FBA     | 16%     | R$ 4,90   | —      | 1,5%     |
| Magalu         | 18%     | R$ 3,00   | 10%    | —        |
| Olist          | 23%     | R$ 5,00   | 5%     | 1%       |
| TikTok Shop    | 6%      | R$ 2,00   | 10%    | 15%      |

> Taxas baseadas na planilha de precificação real. Podem variar por categoria e plano.

## 📄 Licença

MIT
