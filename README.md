# Iranduba em números · Censo 2022

Painel narrativo (site estático) do Censo Demográfico 2022 de Iranduba (AM), comparado com Manaus.
Todos os números vêm de `site/data/dados.json`, gerado a partir de `censo_unificado.csv` e conferido contra o relatório.

## Estrutura
- `site/` — o que é publicado (HTML, CSS, JS, D3 7.9.0 local, fontes auto-hospedadas, imagens, dados, relatório em PDF)
- `scripts/build_dados.py` — gera `dados.json` e roda os 73 testes de reconciliação (aborta se algum falhar)
- `scripts/build_imagens.py` — gera `.webp`/`.jpg` em 640/1080/1600 px, sem upscaling
- `scripts/check_creditos.mjs` — build de produção: falha se faltar crédito de alguma foto
- `tests/verifica_numeros.js` — compara cada `data-ref` do DOM com `dados.json` e acusa números sem origem
- `tests/capturas.py` — capturas de tela via Edge headless

## Rodar localmente
```bash
python scripts/build_dados.py
python -m http.server 4173 --directory site
```

## Publicar na Vercel
1. Preencha o crédito de `cidade-casas-flutuantes` em `site/data/creditos.json` (autor, licença, fonte, url).
2. Suba a pasta para um repositório no GitHub e importe na Vercel (ou `npx vercel --prod` nesta pasta).
   O `vercel.json` já define `outputDirectory: site` e o `buildCommand` de checagem de créditos.

Não há banco de dados: o site lê só o JSON estático (~36 KB). Supabase não é necessário.
