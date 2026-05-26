# Bebidasem · Dashboard de Estoque

Dashboard estático com projeção de cobertura de estoque baseada no histórico de vendas dos últimos 90 dias da loja Bebidasem.

## Como funciona

- **velocidade diária** = total vendido em 90 dias ÷ 90
- **dias de cobertura** = estoque atual ÷ velocidade diária
- **status** muda com o slider:
  - **Crítico** — acaba em menos da metade do limite (ou já zerado)
  - **Atenção** — acaba em menos do limite
  - **Saudável** — cobertura acima do limite
  - **Parado** — tem estoque mas não vendeu nos últimos 90 dias
- **sugestão de pedido** repõe até cobrir o limite + 30 dias, arredondando para múltiplos de 6

## Como atualizar os dados

Os dados ficam em `data.js`. Quando quiser dados frescos:

1. Abra uma conversa no Claude
2. Peça: **"atualize o data.js do dashboard"**
3. Claude usa o conector Shopify para buscar produtos + vendas, e te entrega o novo `data.js`
4. Substitua o arquivo `data.js` no repositório do GitHub
5. Netlify detecta o commit e republica automaticamente em ~1 minuto

## Estrutura

```
bebidasem-dashboard/
├── index.html       ← Layout e estilos
├── data.js          ← Snapshot dos produtos (atualizar conforme necessário)
├── app.js           ← Lógica de filtros, ordenação e projeção
├── netlify.toml     ← Configuração de deploy
└── README.md        ← Este arquivo
```

Nenhuma dependência. Funciona offline depois do primeiro carregamento.

## Deploy no Netlify

Se ainda não está no ar:

1. Suba estes arquivos para um repositório no GitHub
2. No Netlify: **Add new site** → **Import from Git** → escolha o repositório
3. Mantenha as configurações padrão (o `netlify.toml` cuida do resto)
4. Pronto

Sem variáveis de ambiente, sem funções, sem cron.
