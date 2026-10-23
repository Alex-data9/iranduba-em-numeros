// Teste de números no DOM: cole no console da página (ou rode via Playwright: page.evaluate(fs.readFileSync(...))).
// 1) todo elemento [data-ref="chave"] mostra exatamente o valor de dados.json formatado;
// 2) nenhum algarismo aparece no texto fora de [data-ref] (números) ou [data-rotulo] (anos, faixas, nº de tabela);
//    elementos com data-ref="grafico:<chave>" são gerados por JS a partir de dados.json → graficos.<chave>.
(async () => {
  const D = await fetch("data/dados.json").then((r) => r.json());
  const fmt = (v, c) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c }).format(v);
  const falhas = [];
  let conferidos = 0;
  document.querySelectorAll("[data-ref]").forEach((el) => {
    const k = el.dataset.ref;
    if (k.startsWith("grafico:")) {
      if (!D.graficos[k.slice(8)] && !["situacao", "favelas", "analf_def", "def_sexo", "alfab_sexo"].includes(k.slice(8))) falhas.push("gráfico sem dados: " + k);
      return;
    }
    const r = D.refs[k];
    if (!r) return falhas.push("ref inexistente: " + k);
    if (el.classList.contains("contador") && el.closest("[aria-busy]")) return;
    const u = el.dataset.u === undefined ? r.u : el.dataset.u === "0" ? "" : el.dataset.u;
    const esperado = r.v == null ? "sem registro" : fmt(r.v, r.c) + u;
    conferidos++;
    if (el.textContent.trim() !== esperado) falhas.push(`${k}: DOM "${el.textContent.trim()}" ≠ dados.json "${esperado}"`);
  });
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let soltos = 0;
  while (w.nextNode()) {
    const n = w.currentNode;
    if (!/\d/.test(n.data) || n.parentElement.closest("script, style, [data-ref], [data-rotulo], .dica")) continue;
    soltos++;
    falhas.push(`número sem data-ref: "${n.data.trim().slice(0, 60)}" em <${n.parentElement.tagName.toLowerCase()}>`);
  }
  console.log(`${conferidos} números conferidos; ${soltos} sem data-ref; ${falhas.length} falha(s)`);
  return { conferidos, falhas };
})();
