// Iranduba em números · Censo 2022
// Todo número exibido sai de data/dados.json (gerado por scripts/build_dados.py).
(async function () {
  "use strict";

  const D = await fetch("data/dados.json").then((r) => r.json());
  const R = D.refs, G = D.graficos;

  const COR = {
    iranduba: "#B5532E", irandubaClaro: "#E08A5B", irandubaFundo: "#8E3B1D",
    manaus: "#0B1820", manausClaro: "#5B7382",
    tinta: "#1C1813", painel: "#F4ECDA", linha: "#D8C9A8", barrenta: "#B89A6A",
  };
  const CORES_RACA = { Branca: "#56B4E9", Preta: "#CC79A7", Amarela: "#E69F00", Parda: "#009E73", "Indígena": "#F0E442" };
  const NOME = { iranduba: "Iranduba", manaus: "Manaus" };
  const reduzMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ------------------------------------------------------------ formatação
  const arred = (v, c) => (v == null ? null : Math.sign(v) * Math.floor(Math.abs(v) * 10 ** c + 0.5 + 1e-9) / 10 ** c);
  const fmt = (v, c = 0) => (v == null ? "sem registro"
    : new Intl.NumberFormat("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c }).format(arred(v, c)));
  function textoRef(chave, u) {
    const r = R[chave];
    if (!r) throw new Error("ref inexistente: " + chave);
    const unidade = u === undefined ? r.u : u === "0" ? "" : u;
    return r.v == null ? "sem registro" : fmt(r.v, r.c) + unidade;
  }
  const chaveCor = (c) => c.toLowerCase().replace("í", "i");

  // ------------------------------------------------------------ refs no texto
  document.querySelectorAll("[data-ref]").forEach((el) => {
    if (el.dataset.ref.startsWith("grafico:")) return;
    el.textContent = textoRef(el.dataset.ref, el.dataset.u);
    if (!el.title && R[el.dataset.ref]) el.title = "Fonte: " + R[el.dataset.ref].f;
  });

  // contagem animada da abertura (o texto final é sempre o de dados.json)
  document.querySelectorAll(".contador").forEach((el) => {
    const r = R[el.dataset.ref], final = el.textContent;
    if (reduzMovimento || r.v == null) return;
    const u = el.dataset.u === "0" ? "" : el.dataset.u ?? r.u;
    el.textContent = fmt(0, r.c) + u;
    const inicio = performance.now() + 1500, dur = 1600;
    const passo = (t) => {
      const p = Math.min(1, Math.max(0, (t - inicio) / dur));
      if (p < 1) { el.textContent = fmt(r.v * (1 - Math.pow(1 - p, 3)), r.c) + u; requestAnimationFrame(passo); }
      else el.textContent = final;
    };
    requestAnimationFrame(passo);
    setTimeout(() => { el.textContent = final; }, 3600); // garante o valor final mesmo sem quadros de animação
  });

  // ------------------------------------------------------------ alternador global
  let modo = "comparar";
  try { modo = localStorage.getItem("iranduba-modo") || modo; } catch (e) { /* sem armazenamento */ }
  const botoesModo = document.querySelectorAll(".alternador button");
  function municipios() { return modo === "comparar" ? ["iranduba", "manaus"] : [modo]; }
  function aplicaModo(novo) {
    modo = novo;
    document.body.dataset.modo = modo;
    botoesModo.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.modo === modo)));
    try { localStorage.setItem("iranduba-modo", modo); } catch (e) { /* ok */ }
    desenhaTudo();
  }
  botoesModo.forEach((b) => {
    b.addEventListener("click", () => aplicaModo(b.dataset.modo));
    b.addEventListener("keydown", (ev) => {
      if (!["ArrowLeft", "ArrowRight"].includes(ev.key)) return;
      const lista = [...botoesModo], i = lista.indexOf(b), j = (i + (ev.key === "ArrowRight" ? 1 : -1) + lista.length) % lista.length;
      lista[j].focus(); aplicaModo(lista[j].dataset.modo);
    });
  });

  // ------------------------------------------------------------ dica (tooltip)
  const dica = document.getElementById("dica");
  const DICAS = new WeakMap();
  function comDica(sel, fn) {
    sel.each(function (d, i) {
      const info = fn(d, i);
      DICAS.set(this, info);
      this.setAttribute("tabindex", "0");
      this.setAttribute("aria-label", `${info.titulo}: ${info.valor}`);
      this.classList.add("marca");
    });
    sel.on("pointerenter focus", function (ev) { mostraDica(this, ev); })
      .on("pointermove", function (ev) { posicionaDica(ev.clientX, ev.clientY); })
      .on("pointerleave blur", () => { dica.hidden = true; });
  }
  function mostraDica(el, ev) {
    const info = DICAS.get(el);
    dica.replaceChildren();
    const s = document.createElement("strong"); s.textContent = info.valor;
    const t = document.createElement("div"); t.textContent = info.titulo;
    const f = document.createElement("small"); f.textContent = info.fonte || "";
    dica.append(s, t, f);
    dica.hidden = false;
    if (ev.clientX) posicionaDica(ev.clientX, ev.clientY);
    else { const b = el.getBoundingClientRect(); posicionaDica(b.right, b.top); }
  }
  function posicionaDica(x, y) {
    const w = dica.offsetWidth, h = dica.offsetHeight;
    dica.style.left = Math.min(innerWidth - w - 8, x + 14) + "px";
    dica.style.top = Math.max(8, y - h - 12) + "px";
  }

  // ------------------------------------------------------------ utilitários de gráfico
  let uid = 0;
  function novoSvg(el, w, h, rotulo) {
    el.replaceChildren();
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${w} ${h}`).attr("width", w).attr("height", h)
      .attr("role", "img").attr("aria-label", rotulo);
    const id = "h" + ++uid;
    svg.append("defs").append("pattern").attr("id", id).attr("width", 6).attr("height", 6)
      .attr("patternUnits", "userSpaceOnUse").attr("patternTransform", "rotate(45)")
      .append("line").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 6).attr("stroke", "#fff").attr("stroke-width", 2.4).attr("stroke-opacity", 0.75);
    svg.hachura = `url(#${id})`;
    return svg;
  }
  const largura = (el) => Math.max(280, Math.round(el.clientWidth || el.parentElement.clientWidth || 600));
  function eixoX(svg, x, y, h, ticks, formato) {
    const g = svg.append("g").attr("class", "eixo");
    x.ticks(ticks).forEach((t) => {
      g.append("line").attr("class", "grade").attr("x1", x(t)).attr("x2", x(t)).attr("y1", y).attr("y2", h).attr("stroke", COR.linha).attr("stroke-dasharray", "2 4");
      g.append("text").attr("x", x(t)).attr("y", h + 15).attr("text-anchor", "middle").text(formato(t));
    });
  }
  function legenda(el, itens) {
    const ul = document.createElement("ul");
    ul.className = "legenda";
    itens.forEach((it) => {
      const li = document.createElement("li");
      const i = document.createElement("i");
      i.style.background = it.cor;
      if (it.contorno) i.style.boxShadow = "inset 0 0 0 2px " + it.contorno;
      if (it.hachura) i.style.backgroundImage = "repeating-linear-gradient(45deg, rgba(255,255,255,.75) 0 2px, transparent 2px 5px)";
      li.append(i, document.createTextNode(it.nome));
      ul.append(li);
    });
    el.append(ul);
  }
  function nota(painel, texto) {
    const n = painel.querySelector(".modo-nota");
    if (n) n.textContent = texto || "";
  }
  const serieMun = (m, valores, extra = {}) => ({ nome: NOME[m], cor: COR[m], valores, ...extra });

  // Barras horizontais agrupadas (eixo a partir de zero, rótulo direto no fim de cada barra)
  function barrasH(el, o) {
    const w = largura(el);
    const rotW = Math.round(Math.min(150, Math.max(96, w * 0.26)));
    const nS = o.series.length, bh = nS > 1 ? 17 : 24, gap = 14;
    const nRef = (o.ref ? 1 : 0) + (o.linhas || []).length;
    const gh = nS * bh + (nS - 1) * 3, topo = nRef ? 10 + 13 * nRef : 6, base = 26;
    const h = topo + o.grupos.length * (gh + gap) + base;
    const casas = o.casas ?? 1, un = o.unidade ?? "";
    const x = d3.scaleLinear().domain([0, o.max]).range([rotW, w - (nS > 1 ? 112 : 64)]);
    const resumo = o.series.map((s) => s.nome + ": " + o.grupos.map((g, i) => `${g} ${fmt(s.valores[i], casas)}${s.valores[i] == null ? "" : un}`).join("; ")).join(". ");
    const svg = novoSvg(el, w, h, `${o.aria}. ${resumo}`);
    const nTicks = w < 500 ? 4 : 6, casasEixo = Math.max(0, d3.precisionFixed(d3.tickStep(0, o.max, nTicks)));
    eixoX(svg, x, topo - 4, h - base + 4, nTicks, (t) => fmt(t, casasEixo));
    const alerta = new Set([...(o.pequenos || []), ...(o.naoConfiavel || [])]);
    o.grupos.forEach((g, gi) => {
      const y0 = topo + gi * (gh + gap);
      const rot = svg.append("text").attr("x", rotW - 10).attr("y", y0 + gh / 2 + 4).attr("text-anchor", "end").attr("class", "rot").text(g);
      if (alerta.has(g)) rot.append("tspan").attr("class", "alerta").text(" !");
      o.series.forEach((s, si) => {
        const v = s.valores[gi], y = y0 + si * (bh + 3);
        if (v == null) {
          svg.append("text").attr("x", rotW + 6).attr("y", y + bh / 2 + 4).attr("class", "rot rot-suave").text("sem registro" + (nS > 1 ? ` · ${s.nome}` : ""));
          return;
        }
        const r = svg.append("rect").attr("x", x(0)).attr("y", y).attr("height", bh).attr("width", Math.max(1, x(v) - x(0))).attr("fill", s.cor).attr("rx", 1.5);
        comDica(r, () => ({ titulo: `${g} · ${s.nome}`, valor: fmt(v, casas) + un + (s.extra ? s.extra(gi) : ""), fonte: o.fonte }));
        if (alerta.has(g)) svg.append("rect").attr("x", x(0)).attr("y", y).attr("height", bh).attr("width", Math.max(1, x(v) - x(0))).attr("fill", svg.hachura).attr("pointer-events", "none");
        const t = svg.append("text").attr("x", x(v) + 6).attr("y", y + bh / 2 + 4).attr("class", "rot halo").text(fmt(v, casas) + un);
        if (nS > 1 && gi === 0) t.append("tspan").attr("class", "rot-suave").text(" " + s.nome);
      });
    });
    const refs = [...(o.ref ? [{ valor: o.ref.valor, rotulo: o.ref.rotulo, cor: COR.tinta }] : []), ...(o.linhas || [])];
    refs.forEach((l, i) => {
      svg.append("line").attr("class", "ref100").attr("x1", x(l.valor)).attr("x2", x(l.valor)).attr("y1", topo - 6).attr("y2", h - base + 4).attr("stroke", l.cor);
      svg.append("text").attr("x", x(l.valor) + 4).attr("y", 10 + 13 * i).attr("class", "rot rot-suave").attr("fill", l.cor).text(l.rotulo);
    });
    if (o.legenda !== false && nS > 1) legenda(el, o.series.map((s) => ({ nome: s.nome, cor: s.cor })));
  }

  // Barras 100% empilhadas, uma linha por recorte
  function empilhada(el, o) {
    const w = largura(el), esq = 0, dir = w, bh = 30, passo = 62;
    const h = o.linhas.length * passo + 4;
    const svg = novoSvg(el, w, h, o.aria + ". " + o.linhas.map((l) => l.rotulo + ": " + l.partes.map((p) => `${p.nome} ${fmt(p.valor, p.casas ?? 1)}%`).join(", ")).join(". "));
    const x = d3.scaleLinear().domain([0, 100]).range([esq, dir]);
    o.linhas.forEach((l, li) => {
      const y = li * passo + 20;
      svg.append("text").attr("x", 0).attr("y", y - 6).attr("class", "rot").text(l.rotulo);
      let acc = 0;
      l.partes.forEach((p) => {
        const x0 = x(acc), ww = Math.max(0, x(acc + p.valor) - x0);
        acc += p.valor;
        const r = svg.append("rect").attr("x", x0).attr("y", y).attr("width", ww).attr("height", bh).attr("fill", p.cor).attr("stroke", COR.painel).attr("stroke-width", 1);
        comDica(r, () => ({ titulo: `${l.rotulo} · ${p.nome}`, valor: fmt(p.valor, p.casas ?? 1) + "%" + (p.extra || ""), fonte: o.fonte }));
        if (p.hachura) svg.append("rect").attr("x", x0).attr("y", y).attr("width", ww).attr("height", bh).attr("fill", svg.hachura).attr("pointer-events", "none");
        const texto = fmt(p.valor, p.casas ?? 1) + "%";
        if (ww > texto.length * 7.6 + 8) {
          svg.append("text").attr("x", x0 + 6).attr("y", y + bh / 2 + 4.5).attr("class", "rot").attr("fill", p.texto || "#fff").attr("pointer-events", "none").text(texto);
        }
      });
    });
    if (o.legenda) legenda(el, o.legenda);
  }

  // Linhas (série temporal ou por grupo), eixo y a partir de zero
  function linhas(el, o) {
    const w = largura(el), h = o.altura || 300, m = { t: 26, r: w < 500 ? 70 : 92, b: 34, l: w < 500 ? 46 : 64 };
    const svg = novoSvg(el, w, h, o.aria);
    const x = o.categorias
      ? d3.scalePoint().domain(o.x).range([m.l + 10, w - m.r]).padding(0.1)
      : d3.scaleLinear().domain(d3.extent(o.x)).range([m.l + 10, w - m.r]);
    const y = d3.scaleLinear().domain([0, o.yMax]).nice().range([h - m.b, m.t]);
    const g = svg.append("g").attr("class", "eixo");
    y.ticks(5).forEach((t) => {
      g.append("line").attr("x1", m.l).attr("x2", w - m.r + 10).attr("y1", y(t)).attr("y2", y(t)).attr("stroke", COR.linha).attr("stroke-dasharray", "2 4");
      g.append("text").attr("x", m.l - 6).attr("y", y(t) + 4).attr("text-anchor", "end").text(o.formatoY ? o.formatoY(t) : fmt(t, 0));
    });
    o.x.forEach((v, i) => {
      if (o.categorias && w < 520 && i % 2) return;
      g.append("text").attr("x", x(v)).attr("y", h - m.b + 18).attr("text-anchor", "middle").text(o.rotuloX ? o.rotuloX(v) : v);
    });
    if (o.ref != null) {
      svg.append("line").attr("class", "ref100").attr("x1", m.l).attr("x2", w - m.r + 10).attr("y1", y(o.ref)).attr("y2", y(o.ref));
      svg.append("text").attr("x", w - m.r + 10).attr("y", y(o.ref) + 16).attr("text-anchor", "end").attr("class", "rot rot-suave").text(o.refRotulo);
    }
    if (o.marcador) {
      const xm = x(o.marcador.valor);
      svg.append("line").attr("x1", xm).attr("x2", xm).attr("y1", m.t - 8).attr("y2", h - m.b).attr("stroke", COR.barrenta).attr("stroke-width", 1.5).attr("stroke-dasharray", "4 3");
      svg.append("text").attr("x", xm + 5).attr("y", m.t - 10).attr("class", "rot rot-suave").text(o.marcador.rotulo);
    }
    o.series.forEach((s, si) => {
      const pts = o.x.map((v, i) => [x(v), y(s.valores[i])]);
      svg.append("path").attr("d", d3.line().curve(d3.curveMonotoneX)(pts)).attr("fill", "none").attr("stroke", s.cor).attr("stroke-width", 3);
      const ponto = svg.selectAll(null).data(s.valores).join("circle").attr("cx", (d, i) => pts[i][0]).attr("cy", (d, i) => pts[i][1]).attr("r", 5.5)
        .attr("fill", s.cor).attr("stroke", COR.painel).attr("stroke-width", 2);
      comDica(ponto, (d, i) => ({ titulo: `${s.nome} · ${o.rotuloX ? o.rotuloX(o.x[i]) : o.x[i]}`, valor: s.formato(d) + (s.dica ? s.dica(i) : ""), fonte: o.fonte }));
      s.valores.forEach((v, i) => {
        if (o.categorias && w < 520 && i % 2 && i !== s.valores.length - 1) return;
        // com duas séries, o rótulo da mais alta vai acima do ponto e o da mais baixa, abaixo
        const outra = o.series.length > 1 ? o.series[1 - si].valores[i] : null;
        const acima = outra == null ? true : v >= outra;
        svg.append("text").attr("x", pts[i][0]).attr("y", pts[i][1] + (acima ? -11 : 19)).attr("text-anchor", "middle").attr("class", "rot halo").text(s.formato(v));
      });
      const ult = pts[pts.length - 1];
      svg.append("text").attr("x", ult[0] + 10).attr("y", ult[1] + 4).attr("class", "rot").attr("fill", s.cor).text(s.nome);
    });
  }

  // ------------------------------------------------------------ "Sobre estes dados"
  function sobre(painel, info) {
    let det = painel.querySelector(".sobre");
    if (!det) {
      det = document.createElement("details");
      det.className = "sobre";
      painel.append(det);
    }
    const aberto = det.open;
    det.replaceChildren();
    det.open = aberto;
    det.dataset.ref = "grafico:" + painel.dataset.grafico;
    const s = document.createElement("summary"); s.textContent = "Sobre estes dados"; det.append(s);
    const f = document.createElement("p"); f.className = "fonte"; f.textContent = "Fonte: " + info.fonte; det.append(f);
    if (info.nota) { const n = document.createElement("p"); n.className = "nota"; n.textContent = info.nota; det.append(n); }
    const caixa = document.createElement("div"); caixa.className = "tabela-rolagem";
    const t = document.createElement("table");
    const cap = document.createElement("caption"); cap.className = "oculto"; cap.textContent = "Valores do gráfico"; t.append(cap);
    const th = t.createTHead().insertRow();
    info.colunas.forEach((c) => { const e = document.createElement("th"); e.scope = "col"; e.textContent = c; th.append(e); });
    const tb = t.createTBody();
    info.linhas.forEach((l) => { const tr = tb.insertRow(); l.forEach((c, i) => { const td = tr.insertCell(); td.textContent = typeof c === "number" ? fmt(c, info.casas?.[i] ?? (Number.isInteger(c) ? 0 : 2)) : c ?? "sem registro"; }); });
    caixa.append(t); det.append(caixa);
    const b = document.createElement("button"); b.type = "button"; b.className = "baixar"; b.textContent = "Baixar CSV deste gráfico";
    b.addEventListener("click", () => {
      const esc = (v) => (typeof v === "number" ? String(v).replace(".", ",") : `"${String(v ?? "").replace(/"/g, '""')}"`);
      const csv = "﻿" + [info.colunas, ...info.linhas].map((l) => l.map(esc).join(";")).join("\r\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      a.download = `iranduba-${painel.dataset.grafico}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
    det.append(b);
  }

  // ------------------------------------------------------------ gráficos
  const estado = { escala: "indice", recorte: "cor" };
  document.querySelectorAll(".controles").forEach((c) => {
    c.addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      estado[c.dataset.controle] = b.dataset.v;
      c.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      desenhaTudo();
    });
  });

  const GRAFICOS = {
    serie_populacao(painel, el) {
      const S = G.serie_populacao, ms = municipios();
      const indice = estado.escala === "indice";
      const marcador = { valor: 2011, rotulo: "ponte (out/2011)" };
      el.replaceChildren();
      if (indice || ms.length === 1) {
        const series = ms.map((m) => serieMun(m, indice ? S["indice_" + m] : S[m], {
          formato: (v) => fmt(v, indice ? 1 : 0),
          dica: (i) => (indice ? ` · ${fmt(S[m][i])} pessoas` : ""),
          acima: m === "iranduba",
        }));
        linhas(el, {
          x: S.anos, series, yMax: d3.max(series.flatMap((s) => s.valores)) * 1.12, marcador, fonte: S.fonte,
          rotuloX: (v) => String(v), formatoY: (t) => fmt(t, 0),
          aria: indice ? "Linhas: população em índice, 1991 = 100" : `Linha: população residente de ${NOME[ms[0]]}`,
        });
      } else { // pessoas, comparando: dois painéis pequenos, cada um com sua escala a partir de zero
        const wrap = d3.select(el).append("div").style("display", "grid").style("gap", "10px").style("grid-template-columns", el.clientWidth > 520 ? "1fr 1fr" : "1fr");
        ms.forEach((m) => {
          const sub = wrap.append("div").node();
          linhas(sub, {
            x: S.anos, series: [serieMun(m, S[m], { formato: (v) => fmt(v, 0) })], yMax: d3.max(S[m]) * 1.18, fonte: S.fonte, altura: 240,
            rotuloX: (v) => String(v), formatoY: (t) => (t >= 1e6 ? fmt(t / 1e6, 1) + " mi" : fmt(t / 1e3, 0) + " mil"), marcador: { valor: 2011, rotulo: "ponte" },
            aria: `Linha: população residente de ${NOME[m]}`,
          });
        });
        const n = document.createElement("p"); n.className = "legenda"; n.textContent = "Escalas diferentes: Manaus é muito maior. Para comparar o ritmo, use o índice.";
        el.append(n);
      }
      // taxas por período
      const tx = painel.querySelector(".taxas"); tx.replaceChildren(); tx.dataset.ref = "grafico:serie_populacao";
      ms.forEach((m) => S.anos.slice(1).forEach((a, i) => {
        const s = document.createElement("span"); s.className = "taxa " + m[0];
        const b = document.createElement("b"); b.textContent = fmt(S["taxas_" + m][i + 1], 2) + "% a.a.";
        s.append(`${NOME[m]} ${S.anos[i]}–${a}: `, b); tx.append(s);
      }));
      sobre(painel, {
        fonte: S.fonte + ". Taxa geométrica: (P1/P0)^(1/n) − 1, cálculo do autor.", nota: S.nota,
        colunas: ["Ano", "Iranduba (pessoas)", "Índice Iranduba", "Taxa Iranduba (% a.a.)", "Manaus (pessoas)", "Índice Manaus", "Taxa Manaus (% a.a.)"],
        casas: [0, 0, 1, 2, 0, 1, 2],
        linhas: S.anos.map((a, i) => [String(a), S.iranduba[i], S.indice_iranduba[i], S.taxas_iranduba[i], S.manaus[i], S.indice_manaus[i], S.taxas_manaus[i]]),
      });
    },

    piramide(painel, el) {
      const P = G.piramide, ms = municipios(), pct = ms.length > 1;
      nota(painel, pct ? "% da população de cada município" : NOME[ms[0]] + " · pessoas");
      const w = largura(el), meio = w < 520 ? 52 : 74, rowH = w < 520 ? 15 : 17, topo = 26, base = 30;
      const h = topo + P.faixas.length * rowH + base, metade = (w - meio) / 2 - 4;
      const valor = (m, s, i) => (pct ? (P[m][s][i] / R[m + ".pop"].v) * 100 : P[m][s][i]);
      const max = d3.max(ms.flatMap((m) => ["H", "M"].flatMap((s) => P[m][s].map((_, i) => valor(m, s, i)))));
      const x = d3.scaleLinear().domain([0, max * 1.05]).range([0, metade]);
      const cx = w / 2;
      const svg = novoSvg(el, w, h, `Pirâmide etária ${ms.map((m) => NOME[m]).join(" e ")}, homens à esquerda e mulheres à direita, ${pct ? "em percentual" : "em pessoas"}`);
      svg.append("text").attr("x", cx - meio / 2 - 6).attr("y", 14).attr("text-anchor", "end").attr("class", "rot").text("◂ Homens");
      svg.append("text").attr("x", cx + meio / 2 + 6).attr("y", 14).attr("class", "rot").text("Mulheres ▸");
      const ordem = P.faixas.map((f, i) => i).reverse(); // mais velhos no topo
      const yy = (i) => topo + ordem.indexOf(i) * rowH;
      const eixo = svg.append("g").attr("class", "eixo");
      x.ticks(w < 520 ? 2 : 3).forEach((t) => {
        [cx - meio / 2 - x(t), cx + meio / 2 + x(t)].forEach((xx) => {
          eixo.append("line").attr("x1", xx).attr("x2", xx).attr("y1", topo - 4).attr("y2", h - base + 2).attr("stroke", COR.linha).attr("stroke-dasharray", "2 4");
          eixo.append("text").attr("x", xx).attr("y", h - base + 16).attr("text-anchor", "middle").text(pct ? fmt(t, 1) + "%" : fmt(t, 0));
        });
      });
      P.faixas.forEach((f, i) => {
        if (w < 520 && i % 2) return;
        svg.append("text").attr("x", cx).attr("y", yy(i) + rowH / 2 + 4).attr("text-anchor", "middle").attr("class", "eixo").append("tspan").attr("font-size", 10.5).attr("fill", "#4D4337")
          .text(f.replace(" anos", "").replace(" ou mais", "+").replace(" a ", "–"));
      });
      ms.forEach((m, mi) => {
        ["H", "M"].forEach((s) => {
          const lado = s === "H" ? -1 : 1, x0 = cx + (lado * meio) / 2;
          if (pct && mi === 1) { // Manaus sobreposta como contorno em degraus
            let d = "";
            P.faixas.forEach((f, i) => { const xx = x0 + lado * x(valor(m, s, i)); d += `${d ? "L" : "M"}${xx} ${yy(i) + rowH}L${xx} ${yy(i)}`; });
            svg.append("path").attr("d", d).attr("fill", "none").attr("stroke", COR.manaus).attr("stroke-width", 2.2);
            return;
          }
          const cor = m === "iranduba" ? (s === "H" ? COR.iranduba : COR.irandubaClaro) : (s === "H" ? COR.manaus : COR.manausClaro);
          const sel = svg.selectAll(null).data(P.faixas).join("rect")
            .attr("x", (f, i) => (lado < 0 ? x0 - x(valor(m, s, i)) : x0)).attr("y", (f, i) => yy(i) + 1)
            .attr("width", (f, i) => Math.max(0.5, x(valor(m, s, i)))).attr("height", rowH - 2).attr("fill", cor);
          comDica(sel, (f, i) => ({ titulo: `${NOME[m]} · ${s === "H" ? "Homens" : "Mulheres"} · ${f}`, valor: `${fmt(P[m][s][i])} pessoas (${fmt((P[m][s][i] / R[m + ".pop"].v) * 100, 1)}%)`, fonte: P.fonte }));
          sel.attr("tabindex", null);
        });
      });
      if (pct) legenda(el, [{ nome: "Iranduba (barras)", cor: COR.iranduba }, { nome: "Manaus (contorno)", cor: "transparent", contorno: COR.manaus }]);
      sobre(painel, {
        fonte: P.fonte,
        colunas: ["Faixa etária", "Iranduba H", "Iranduba M", "Manaus H", "Manaus M"],
        linhas: P.faixas.map((f, i) => [f, P.iranduba.H[i], P.iranduba.M[i], P.manaus.H[i], P.manaus.M[i]]),
        nota: `Soma da pirâmide de Iranduba = ${fmt(R["iranduba.pop"].v)}, igual à população total.`,
      });
    },

    razao_faixa(painel, el) {
      const S = G.razao_faixa, ms = municipios();
      linhas(el, {
        x: S.grupos, categorias: true, rotuloX: (v) => v.replace(" anos", "").replace(" ou mais", "+").replace(" a ", "–"),
        series: ms.map((m) => serieMun(m, S[m], { formato: (v) => fmt(v, 1), acima: m === "iranduba" })),
        yMax: 130, ref: 100, refRotulo: "100 = mesmo número", fonte: S.fonte, altura: 330,
        aria: "Linhas: homens para cada 100 mulheres por grupo de idade. " + ms.map((m) => NOME[m] + ": " + S.grupos.map((g, i) => g + " " + fmt(S[m][i], 1)).join("; ")).join(". "),
      });
      sobre(painel, { fonte: S.fonte, colunas: ["Faixa etária", "Razão Iranduba", "Razão Manaus"], casas: [0, 1, 1], linhas: S.grupos.map((g, i) => [g, S.iranduba[i], S.manaus[i]]) });
    },

    cor(painel, el) {
      const C = G.cor, ordem = ["Parda", "Branca", "Preta", "Indígena", "Amarela"];
      const linhasCor = [];
      const parte = (c, chave, contagem) => ({
        nome: c, valor: R[chave].v, cor: CORES_RACA[c], texto: ["Indígena", "Amarela", "Branca"].includes(c) ? COR.tinta : "#fff",
        hachura: C.pequenos.includes(c), extra: contagem != null ? ` · ${fmt(contagem)} pessoas` : "",
      });
      const idx = (c) => C.cores.indexOf(c);
      if (modo !== "manaus") {
        linhasCor.push({ rotulo: "Iranduba, 2010", partes: ordem.map((c) => parte(c, `iranduba.cor_${chaveCor(c)}_2010_pct`, C.iranduba_2010[idx(c)])) });
        linhasCor.push({ rotulo: "Iranduba, 2022", partes: ordem.map((c) => parte(c, `iranduba.cor_${chaveCor(c)}_2022_pct`, C.iranduba_2022[idx(c)])) });
      }
      if (modo !== "iranduba") linhasCor.push({ rotulo: "Manaus, 2022", partes: ordem.map((c) => parte(c, `manaus.cor_${chaveCor(c)}_2022_pct`, C.manaus_2022[idx(c)])) });
      empilhada(el, {
        linhas: linhasCor, fonte: C.fonte, aria: "Barras 100% por cor ou raça",
        legenda: ordem.map((c) => ({ nome: c + (C.pequenos.includes(c) ? " (grupo pequeno)" : ""), cor: CORES_RACA[c], hachura: C.pequenos.includes(c) })),
      });
      sobre(painel, {
        fonte: C.fonte, nota: C.nota,
        colunas: ["Cor ou raça", "Iranduba 2010", "% 2010", "Iranduba 2022", "% 2022", "Manaus 2022", "% Manaus"],
        casas: [0, 0, 1, 0, 1, 0, 1],
        linhas: ordem.map((c) => [c, C.iranduba_2010[idx(c)], R[`iranduba.cor_${chaveCor(c)}_2010_pct`].v, C.iranduba_2022[idx(c)], R[`iranduba.cor_${chaveCor(c)}_2022_pct`].v, C.manaus_2022[idx(c)], R[`manaus.cor_${chaveCor(c)}_2022_pct`].v]),
      });
    },

    mediana_cor(painel, el) {
      const M = G.mediana_cor;
      barrasH(el, {
        grupos: M.cores, series: municipios().map((m) => serieMun(m, M[m])), max: 45, casas: 0, fonte: M.fonte, pequenos: ["Amarela", "Indígena"],
        aria: "Barras: idade mediana por cor ou raça",
      });
      sobre(painel, { fonte: M.fonte, colunas: ["Cor ou raça", "Iranduba (anos)", "Manaus (anos)"], linhas: M.cores.map((c, i) => [c, M.iranduba[i], M.manaus[i]]) });
    },

    razao_cor(painel, el) {
      const Z = G.razao_cor, grupos = Z.iranduba.map((d) => d.cor);
      barrasH(el, {
        grupos, series: municipios().map((m) => serieMun(m, Z[m].map((d) => d.razao), { extra: (i) => ` · ${fmt(Z[m][i].H)} H / ${fmt(Z[m][i].M)} M` })),
        max: 160, casas: 1, ref: { valor: 100, rotulo: "100" }, fonte: Z.fonte, pequenos: ["Amarela", "Indígena"],
        aria: "Barras: homens para cada 100 mulheres por cor ou raça",
      });
      sobre(painel, {
        fonte: Z.fonte, casas: [0, 0, 0, 2, 0, 0, 2],
        colunas: ["Cor ou raça", "Iranduba H", "Iranduba M", "Razão Iranduba", "Manaus H", "Manaus M", "Razão Manaus"],
        linhas: grupos.map((g, i) => [g, Z.iranduba[i].H, Z.iranduba[i].M, Z.iranduba[i].razao, Z.manaus[i].H, Z.manaus[i].M, Z.manaus[i].razao]),
      });
    },

    alfab_cor(painel, el) {
      const A = G.alfab_cor;
      barrasH(el, {
        grupos: A.grupos, series: municipios().map((m) => serieMun(m, A[m].Total)), max: 100, casas: 2, unidade: "%", fonte: A.fonte, pequenos: A.pequenos,
        aria: "Barras: taxa de alfabetização das pessoas de 15 anos ou mais por cor ou raça",
      });
      sobre(painel, {
        fonte: A.fonte, nota: A.nota, casas: [0, 2, 2, 2, 2, 2, 2],
        colunas: ["Cor ou raça", "Iranduba total", "Iranduba H", "Iranduba M", "Manaus total", "Manaus H", "Manaus M"],
        linhas: A.grupos.map((g, i) => [g, A.iranduba.Total[i], A.iranduba.Homens[i], A.iranduba.Mulheres[i], A.manaus.Total[i], A.manaus.Homens[i], A.manaus.Mulheres[i]]),
      });
    },

    alfab_sexo(painel, el) {
      const A = G.alfab_cor, m = modo === "manaus" ? "manaus" : "iranduba";
      nota(painel, NOME[m]);
      barrasH(el, {
        grupos: A.grupos, max: 100, casas: 2, unidade: "%", fonte: A.fonte, pequenos: A.pequenos,
        series: [{ nome: "Homens", cor: COR[m], valores: A[m].Homens }, { nome: "Mulheres", cor: COR[m + "Claro"], valores: A[m].Mulheres }],
        aria: `Barras: alfabetização de homens e mulheres por cor ou raça, ${NOME[m]}`,
      });
      sobre(painel, {
        fonte: A.fonte, nota: A.nota, casas: [0, 2, 2, 2],
        colunas: ["Cor ou raça", "Homens (%)", "Mulheres (%)", "Mulheres − Homens (p.p.)"],
        linhas: A.grupos.map((g, i) => [g, A[m].Homens[i], A[m].Mulheres[i], arred(A[m].Mulheres[i] - A[m].Homens[i], 2)]),
      });
    },

    situacao(painel, el) {
      const ms = municipios();
      empilhada(el, {
        fonte: R["iranduba.urbana_pct"].f, aria: "Barras 100%: população urbana e rural",
        linhas: ms.map((m) => ({
          rotulo: NOME[m], partes: [
            { nome: "Urbana", valor: R[m + ".urbana_pct"].v, casas: 2, cor: COR[m], extra: ` · ${fmt(R[m + ".urbana"].v)} pessoas` },
            { nome: "Rural", valor: R[m + ".rural_pct"].v, casas: 2, cor: COR.barrenta, texto: COR.tinta, extra: ` · ${fmt(R[m + ".rural"].v)} pessoas` },
          ],
        })),
        legenda: [{ nome: "Urbana (cor do município)", cor: COR[ms[0]] }, { nome: "Rural", cor: COR.barrenta }],
      });
      sobre(painel, {
        fonte: R["iranduba.urbana_pct"].f, casas: [0, 0, 2, 0, 2],
        colunas: ["Município", "Urbana (pessoas)", "Urbana (%)", "Rural (pessoas)", "Rural (%)"],
        linhas: ["iranduba", "manaus"].map((m) => [NOME[m], R[m + ".urbana"].v, R[m + ".urbana_pct"].v, R[m + ".rural"].v, R[m + ".rural_pct"].v]),
      });
    },

    favelas(painel, el) {
      const fi = R["iranduba.favelas_pct"].v;
      nota(painel, modo === "manaus" ? "percentual só para Iranduba" : "");
      empilhada(el, {
        fonte: R["iranduba.favelas_pct"].f, aria: "Barra 100%: população de Iranduba em favelas e comunidades urbanas",
        linhas: [{ rotulo: "Iranduba", partes: [
          { nome: "Em favelas e comunidades urbanas", valor: fi, cor: COR.iranduba, extra: ` · ${fmt(R["iranduba.favelas_pop"].v)} pessoas, calculado pelo autor` },
          { nome: "Demais moradores", valor: arred(100 - fi, 1), cor: COR.linha, texto: COR.tinta },
        ] }],
      });
      const p = document.createElement("p"); p.className = "legenda";
      p.textContent = `Iranduba: ${fmt(R["iranduba.favelas_n"].v)} favelas, ${fmt(R["iranduba.favelas_pop"].v)} pessoas. Manaus: ${fmt(R["manaus.favelas_n"].v)} favelas, ${fmt(R["manaus.favelas_pop"].v)} pessoas. Alfabetização em favelas: Iranduba ${textoRef("iranduba.alfab_favelas")}, Manaus ${textoRef("manaus.alfab_favelas")}.`;
      el.append(p);
      sobre(painel, {
        fonte: F("iranduba.favelas_pop") + "; Panorama · Número de favelas; Alfabetizados em favelas",
        nota: R["iranduba.favelas_pct"].n,
        colunas: ["Município", "Favelas", "Pessoas em favelas", "% da população", "Alfabetização em favelas (%)"], casas: [0, 0, 0, 1, 2],
        linhas: [["Iranduba", R["iranduba.favelas_n"].v, R["iranduba.favelas_pop"].v, fi, R["iranduba.alfab_favelas"].v], ["Manaus", R["manaus.favelas_n"].v, R["manaus.favelas_pop"].v, null, R["manaus.alfab_favelas"].v]],
      });
    },

    deficiencia_cor(painel, el) {
      const Q = G.deficiencia_cor, ms = municipios(), grupos = Q.iranduba.map((d) => d.cor);
      barrasH(el, {
        grupos, max: 32, casas: 1, unidade: "%", fonte: Q.fonte, naoConfiavel: Q.nao_confiavel, pequenos: ["Indígena"],
        series: ms.map((m) => serieMun(m, Q[m].map((d) => d.pct), { extra: (i) => ` · ${fmt(Q[m][i].casos)} de ${fmt(Q[m][i].pop)} pessoas` })),
        linhas: ms.map((m) => ({ valor: Q[m][0].pct, cor: COR[m], rotulo: "total " + NOME[m] })),
        aria: "Barras: pessoas de 2 anos ou mais com deficiência por cor ou raça; Amarela não confiável",
      });
      sobre(painel, {
        fonte: Q.fonte, nota: Q.nota, casas: [0, 0, 0, 1, 0, 0, 1],
        colunas: ["Cor ou raça", "Iranduba pessoas 2+", "Iranduba com deficiência", "Iranduba %", "Manaus pessoas 2+", "Manaus com deficiência", "Manaus %"],
        linhas: grupos.map((g, i) => [g, Q.iranduba[i].pop, Q.iranduba[i].casos, Q.iranduba[i].pct, Q.manaus[i].pop, Q.manaus[i].casos, Q.manaus[i].pct]),
      });
    },

    autismo_cor(painel, el) {
      const Q = G.autismo_cor, ms = municipios(), grupos = Q.iranduba.map((d) => d.cor);
      barrasH(el, {
        grupos, max: 2, casas: 1, unidade: "%", fonte: Q.fonte, pequenos: ["Amarela", "Indígena"],
        series: ms.map((m) => serieMun(m, Q[m].map((d) => d.pct), { extra: (i) => ` · ${fmt(Q[m][i].casos)} casos` })),
        aria: "Barras: pessoas com diagnóstico de autismo por cor ou raça",
      });
      sobre(painel, {
        fonte: Q.fonte, nota: Q.nota, casas: [0, 0, 0, 1, 0, 0, 1],
        colunas: ["Cor ou raça", "Iranduba população (10147)", "Iranduba com autismo", "Iranduba %", "Manaus população (10147)", "Manaus com autismo", "Manaus %"],
        linhas: grupos.map((g, i) => [g, Q.iranduba[i].pop, Q.iranduba[i].casos, Q.iranduba[i].pct, Q.manaus[i].pop, Q.manaus[i].casos, Q.manaus[i].pct]),
      });
    },

    analf_def(painel, el) {
      nota(painel, "só Iranduba");
      barrasH(el, {
        grupos: ["Com deficiência", "Sem deficiência"], max: 25, casas: 2, unidade: "%", fonte: F("iranduba.analf_com_def"),
        series: [serieMun("iranduba", [R["iranduba.analf_com_def"].v, R["iranduba.analf_sem_def"].v])],
        aria: "Barras: taxa de analfabetismo de pessoas com e sem deficiência em Iranduba",
      });
      sobre(painel, { fonte: F("iranduba.analf_com_def"), colunas: ["Grupo", "Analfabetismo (%)"], casas: [0, 2], linhas: [["Com deficiência", R["iranduba.analf_com_def"].v], ["Sem deficiência", R["iranduba.analf_sem_def"].v]] });
    },

    def_sexo(painel, el) {
      nota(painel, "só Iranduba");
      barrasH(el, {
        grupos: ["Deficiência", "Autismo"], max: 10, casas: 1, unidade: "%", fonte: F("iranduba.def_h") + "; Autismo, por sexo",
        series: [{ nome: "Homens", cor: COR.iranduba, valores: [R["iranduba.def_h"].v, R["iranduba.aut_h"].v] }, { nome: "Mulheres", cor: COR.irandubaClaro, valores: [R["iranduba.def_m"].v, R["iranduba.aut_m"].v] }],
        aria: "Barras: deficiência e autismo por sexo em Iranduba",
      });
      sobre(painel, { fonte: F("iranduba.def_h") + "; Autismo, por sexo", nota: "Percentuais dentro de cada sexo; resultados amostrais.", colunas: ["Indicador", "Homens (%)", "Mulheres (%)"], casas: [0, 1, 1], linhas: [["Deficiência", R["iranduba.def_h"].v, R["iranduba.def_m"].v], ["Autismo", R["iranduba.aut_h"].v, R["iranduba.aut_m"].v]] });
    },

    conjuge(painel, el) {
      const C = G.conjuge, ms = municipios(), alfa = [1, 0.55, 0.3];
      const chaves = ["sexo_dif_pct", "mesmo_sexo_pct", "sem_conjuge_pct"];
      empilhada(el, {
        fonte: C.fonte, aria: "Barras 100%: domicílios por presença de cônjuge",
        linhas: ms.map((m) => ({ rotulo: NOME[m], partes: C.categorias.map((c, i) => ({
          nome: c, valor: R[`${m}.${chaves[i]}`].v, casas: R[`${m}.${chaves[i]}`].c, cor: d3.color(COR[m]).copy({ opacity: alfa[i] }).formatRgb(),
          texto: i === 0 ? "#fff" : COR.tinta, extra: ` · ${fmt(C[m][i])} domicílios`,
        })) })),
        legenda: C.categorias.map((c, i) => ({ nome: c, cor: d3.color(COR[ms[0]]).copy({ opacity: alfa[i] }).formatRgb() })),
      });
      sobre(painel, {
        fonte: C.fonte, colunas: ["Situação", "Iranduba (domicílios)", "Iranduba %", "Manaus (domicílios)", "Manaus %"], casas: [0, 0, 2, 0, 2],
        linhas: C.categorias.map((c, i) => [c, C.iranduba[i], arred((C.iranduba[i] / R["iranduba.domicilios"].v) * 100, 2), C.manaus[i], arred((C.manaus[i] / R["manaus.domicilios"].v) * 100, 2)]),
      });
    },

    composicao(painel, el) {
      const C = G.composicao, ms = municipios(), alfa = [0.3, 1, 0.75, 0.5, 0.16];
      const linhasC = [];
      ms.forEach((m) => [["Homens", "tot_h", "homem"], ["Mulheres", "tot_m", "mulher"]].forEach(([s, t, rot]) => {
        linhasC.push({ rotulo: `${NOME[m]} · responsável ${rot}`, partes: C.categorias.map((c, i) => ({
          nome: c, valor: arred((C[m][s][i] / C[m][t]) * 100, 1), cor: d3.color(COR[m]).copy({ opacity: alfa[i] }).formatRgb(),
          texto: alfa[i] > 0.6 ? "#fff" : COR.tinta, extra: ` · ${fmt(C[m][s][i])} de ${fmt(C[m][t])} domicílios`, hachura: i === 3,
        })) });
      }));
      empilhada(el, {
        fonte: C.fonte, aria: "Barras 100%: composição do domicílio dentro de cada sexo da pessoa responsável", linhas: linhasC,
        legenda: C.categorias.map((c, i) => ({ nome: c, cor: d3.color(COR[ms[0]]).copy({ opacity: alfa[i] }).formatRgb(), hachura: i === 3 })),
      });
      sobre(painel, {
        fonte: C.fonte, nota: C.nota, casas: [0, 1, 1, 1, 1],
        colunas: ["Tipo de composição", "Iranduba · homem (%)", "Iranduba · mulher (%)", "Manaus · homem (%)", "Manaus · mulher (%)"],
        linhas: C.categorias.map((c, i) => [c, arred((C.iranduba.Homens[i] / C.iranduba.tot_h) * 100, 1), arred((C.iranduba.Mulheres[i] / C.iranduba.tot_m) * 100, 1), arred((C.manaus.Homens[i] / C.manaus.tot_h) * 100, 1), arred((C.manaus.Mulheres[i] / C.manaus.tot_m) * 100, 1)]),
      });
    },

    moradores(painel, el) {
      const Mo = G.moradores, ms = municipios(), porCor = estado.recorte === "cor";
      const grupos = ["Total", ...(porCor ? Mo.cores : Mo.idades)];
      const vals = (m, s) => [Mo[m].total[s], ...(porCor ? Mo[m].cor[s] : Mo[m].idade[s])];
      const series = ms.length > 1
        ? ms.map((m) => serieMun(m, vals(m, "Total")))
        : [{ nome: "Responsável homem", cor: COR[ms[0]], valores: vals(ms[0], "Homens") }, { nome: "Responsável mulher", cor: COR[ms[0] + "Claro"], valores: vals(ms[0], "Mulheres") }];
      barrasH(el, {
        grupos, series, max: 5, casas: 2, fonte: Mo.fonte, pequenos: porCor ? Mo.pequenos : [],
        aria: `Barras: média de moradores por ${porCor ? "cor ou raça" : "idade"} da pessoa responsável`,
      });
      if (ms.length > 1) { const p = document.createElement("p"); p.className = "legenda"; p.textContent = "Escolha só Iranduba ou só Manaus no alternador para separar homens e mulheres responsáveis."; el.append(p); }
      sobre(painel, {
        fonte: Mo.fonte, nota: Mo.nota, casas: [0, 2, 2, 2, 2, 2, 2],
        colunas: [porCor ? "Cor ou raça" : "Idade", "Iranduba total", "Iranduba H", "Iranduba M", "Manaus total", "Manaus H", "Manaus M"],
        linhas: grupos.map((g, i) => [g, vals("iranduba", "Total")[i], vals("iranduba", "Homens")[i], vals("iranduba", "Mulheres")[i], vals("manaus", "Total")[i], vals("manaus", "Homens")[i], vals("manaus", "Mulheres")[i]]),
      });
    },

    sintese(painel, el) {
      if (el.childElementCount) return;
      const S = G.sintese, caixa = document.createElement("div"); caixa.className = "tabela-rolagem";
      const t = document.createElement("table"); t.className = "tabela-sintese";
      const cap = document.createElement("caption"); cap.className = "oculto"; cap.textContent = "Indicadores-síntese, Iranduba e Manaus"; t.append(cap);
      const h = t.createTHead().insertRow();
      ["Indicador", "Iranduba", "Manaus"].forEach((c) => { const e = document.createElement("th"); e.scope = "col"; e.textContent = c; h.append(e); });
      const b = t.createTBody();
      S.linhas.forEach(([rot, ki, km]) => {
        const tr = b.insertRow();
        const th = document.createElement("th"); th.scope = "row"; th.textContent = rot; th.style.fontWeight = 400; tr.append(th);
        [[ki, "i"], [km, "m"]].forEach(([k, c]) => { const td = tr.insertCell(); td.className = c; td.dataset.ref = k; td.dataset.u = "0"; td.textContent = textoRef(k, "0"); td.title = "Fonte: " + R[k].f; });
      });
      caixa.append(t); el.append(caixa);
      const f = document.createElement("p"); f.className = "legenda"; f.textContent = "Fonte: " + S.fonte + ". Mesma tabela do relatório (Tabela 16).";
      el.append(f);
    },
  };
  function F(chave) { return R[chave].f; }

  function desenhaTudo() {
    dica.hidden = true;
    document.querySelectorAll("[data-grafico]").forEach((painel) => {
      const el = painel.querySelector(".grafico");
      el.dataset.ref = "grafico:" + painel.dataset.grafico;
      try { GRAFICOS[painel.dataset.grafico](painel, el); } catch (e) { console.error(painel.dataset.grafico, e); }
    });
  }
  aplicaModo(["iranduba", "manaus", "comparar"].includes(modo) ? modo : "comparar");
  let larguraAnterior = innerWidth, tempo;
  addEventListener("resize", () => {
    if (Math.abs(innerWidth - larguraAnterior) < 8) return;
    larguraAnterior = innerWidth;
    clearTimeout(tempo); tempo = setTimeout(desenhaTudo, 180);
  });

  // ------------------------------------------------------------ créditos das fotos
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === "file:";
  fetch("data/creditos.json").then((r) => r.json()).then((lista) => {
    const ul = document.getElementById("creditos");
    lista.forEach((c) => {
      const li = document.createElement("li");
      const completo = c.autor && c.licenca && c.fonte && c.url;
      if (!completo) {
        if (!local) return; // em produção o build falha antes de chegar aqui
        li.className = "pendente";
        li.textContent = `${c.arquivo}: Crédito pendente (preencher em data/creditos.json)`;
      } else {
        const a = document.createElement("a"); a.href = c.url; a.textContent = c.autor; a.rel = "noopener";
        const lic = document.createElement("a"); lic.href = c.licenca_url || c.url; lic.rel = "noopener license";
        const s = document.createElement("span"); s.dataset.rotulo = ""; s.textContent = c.licenca; lic.append(s);
        li.append(`${c.arquivo.replace(/-/g, " ")} — `, a, ", ", lic, `, ${c.fonte}.`);
      }
      ul.append(li);
    });
  });

  // ------------------------------------------------------------ revelação por rolagem e sumário ativo
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visivel"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".revela").forEach((el) => io.observe(el));
    const links = new Map([...document.querySelectorAll(".sumario a")].map((a) => [a.hash.slice(1), a]));
    const ativo = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) links.forEach((a, id) => a.setAttribute("aria-current", String(id === e.target.id)));
    }), { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main > section").forEach((s) => ativo.observe(s));
  } else document.querySelectorAll(".revela").forEach((el) => el.classList.add("visivel"));

  // ------------------------------------------------------------ modo apresentação (P, depois setas)
  const secoes = [...document.querySelectorAll("main > section")];
  addEventListener("keydown", (ev) => {
    if (ev.target.closest("input, textarea, select, [contenteditable]") || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (ev.key === "p" || ev.key === "P") { document.body.classList.toggle("apresentacao"); return; }
    if (!document.body.classList.contains("apresentacao")) return;
    const dir = { ArrowDown: 1, ArrowRight: 1, PageDown: 1, " ": 1, ArrowUp: -1, ArrowLeft: -1, PageUp: -1 }[ev.key];
    if (!dir) { if (ev.key === "Escape") document.body.classList.remove("apresentacao"); return; }
    ev.preventDefault();
    let atual = 0;
    secoes.forEach((s, j) => { if (s.getBoundingClientRect().top <= 8) atual = j; });
    const i = Math.min(secoes.length - 1, Math.max(0, atual + dir));
    secoes[i].scrollIntoView({ behavior: reduzMovimento ? "auto" : "smooth" });
  });
})();
