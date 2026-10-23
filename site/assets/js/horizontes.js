// Faixas-horizonte vetoriais: silhuetas originais (ponte, chaminés, mata, campos, palafitas).
// Cada seção recebe uma variação; todas desenhadas em viewBox 1440 × 140, com o chão em y = 140.
(function () {
  const W = 1440, H = 140;

  function aleatorio(semente) { // gerador determinístico: a mesma seção desenha sempre igual
    let s = semente;
    return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  }

  function mata(rnd, base, alt, x0 = 0, x1 = W) { // linha de copas
    let d = `M${x0} ${H}V${base}`;
    for (let x = x0; x < x1;) {
      const w = 18 + rnd() * 34, h = alt * (0.45 + rnd() * 0.55);
      d += `q${w / 2} ${-h} ${w} 0`;
      x += w;
    }
    return d + `V${H}Z`;
  }

  function ponte(cx, deck, topo, vao, cabos = 11) { // estaiada: mastro central, cabos em leque
    let d = `M${cx - vao - 220} ${deck}h${2 * vao + 440}v5h-${2 * vao + 440}z`;
    for (let i = -6; i <= 6; i++) if (i) d += `M${cx + i * (vao + 220) / 6 - 3} ${deck + 5}h6v${H - deck}h-6z`;
    d += `M${cx - 7} ${topo}h14l6 ${H - topo}h-26z`;
    let c = "";
    for (let i = 1; i <= cabos; i++) {
      const dx = (vao * i) / cabos, y = topo + 6 + i * 1.6;
      c += `M${cx} ${y}L${cx - dx} ${deck}M${cx} ${y}L${cx + dx} ${deck}`;
    }
    return { d, c };
  }

  function chamine(x, h, w = 16) { // chaminé de olaria com boca alargada e galpão
    return `M${x} ${H}V${H - h}h-2v-5h${w + 4}v5h-2V${H}z` +
      `M${x - 46} ${H}v-24l30-14h${w + 34}l30 14v24z`;
  }

  function fumaca(x, y, n = 5) {
    let s = "";
    for (let i = 0; i < n; i++) s += `<circle cx="${x + 4}" cy="${y - 4}" r="${6 + i}" style="animation-delay:${(i * 1.4).toFixed(1)}s"/>`;
    return `<g class="fumaca" fill="currentColor" fill-opacity=".9">${s}</g>`;
  }

  function palafita(x, base, w, h) { // casa sobre esteios
    const p = base - 26;
    return `M${x} ${p}h${w}v${-h}l${-w / 2} -${h * 0.55}l${-w / 2} ${h * 0.55}z` +
      `M${x + 4} ${p}h4v26h-4zM${x + w - 8} ${p}h4v26h-4zM${x + w / 2 - 2} ${p}h4v26h-4z`;
  }

  function agua(y) {
    return `<path d="M0 ${y}c120 6 240-6 360 0s240 6 360 0 240-6 360 0 240 6 360 0V${H}H0z" fill="currentColor" fill-opacity=".55"/>`;
  }

  const DESENHOS = {
    abertura(rnd) {
      const p = ponte(1020, 92, 18, 260);
      let ch = "", fm = "";
      [[130, 92], [210, 70], [300, 104], [1330, 84]].forEach(([x, h]) => { ch += chamine(x, h); fm += fumaca(x + 8, H - h - 5); });
      return `<path d="${mata(rnd, 118, 22)}" fill="currentColor" fill-opacity=".8"/>` +
        `<path d="${p.c}" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="${p.d}" fill="currentColor"/>` +
        `<path d="${ch}" fill="currentColor"/>${fm}${agua(126)}`;
    },
    ponte(rnd) {
      const p = ponte(720, 86, 8, 300, 13);
      return `<path d="${mata(rnd, 116, 20, 0, 380)}" fill="currentColor"/><path d="${mata(rnd, 116, 20, 1060)}" fill="currentColor"/>` +
        `<path d="${p.c}" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="${p.d}" fill="currentColor"/>${agua(124)}`;
    },
    chamines(rnd) {
      let ch = "", fm = "";
      for (let x = 70; x < W; x += 150 + rnd() * 110) {
        const h = 60 + rnd() * 60;
        ch += chamine(x, h, 14 + rnd() * 6);
        fm += fumaca(x + 8, H - h - 5, 4);
      }
      return `<path d="${mata(rnd, 124, 16)}" fill="currentColor" fill-opacity=".7"/><path d="${ch}" fill="currentColor"/>${fm}`;
    },
    mata(rnd) {
      return `<path d="${mata(rnd, 90, 46)}" fill="currentColor" fill-opacity=".55"/><path d="${mata(rnd, 112, 34)}" fill="currentColor"/>`;
    },
    olarias(rnd) {
      let ch = "", fm = "", tij = "";
      for (let x = 120; x < W; x += 260 + rnd() * 120) {
        const h = 80 + rnd() * 40;
        ch += chamine(x, h, 18);
        fm += fumaca(x + 9, H - h - 5, 5);
        for (let i = 0; i < 4; i++) for (let j = 0; j < 3 - (i % 2); j++) tij += `M${x + 70 + j * 18 + (i % 2) * 9} ${H - 8 - i * 9}h16v7h-16z`;
      }
      return `<path d="${mata(rnd, 126, 12)}" fill="currentColor" fill-opacity=".6"/><path d="${ch}" fill="currentColor"/><path d="${tij}" fill="currentColor" fill-opacity=".85"/>${fm}`;
    },
    campos(rnd) {
      let linhas = "", arv = "", casas = "";
      for (let i = 0; i < 6; i++) linhas += `M0 ${104 + i * 6}L${W} ${100 + i * 7}`;
      for (let x = 30; x < 760; x += 38 + rnd() * 10) arv += `M${x} ${H}v-30h3v30zM${x + 1.5} ${H - 50}a${14 + rnd() * 4} ${14} 0 1 0 0.1 0z`;
      for (let x = 900; x < W - 60; x += 90 + rnd() * 40) casas += palafita(x, H, 46, 18 + rnd() * 6);
      return `<path d="${mata(rnd, 96, 22)}" fill="currentColor" fill-opacity=".35"/><path d="${linhas}" stroke="currentColor" stroke-width="1.4" fill="none"/>` +
        `<path d="${arv}" fill="currentColor"/><path d="${casas}" fill="currentColor"/>${agua(128)}`;
    },
    "mata-sobria"(rnd) {
      return `<path d="${mata(rnd, 104, 30)}" fill="currentColor" fill-opacity=".45"/><path d="${mata(rnd, 120, 18)}" fill="currentColor" fill-opacity=".8"/>`;
    },
    palafitas(rnd) {
      let casas = "";
      for (let x = 20; x < W - 60; x += 70 + rnd() * 50) casas += palafita(x, H - 4, 40 + rnd() * 20, 16 + rnd() * 10);
      return `<path d="${mata(rnd, 92, 24)}" fill="currentColor" fill-opacity=".35"/><path d="${casas}" fill="currentColor"/>${agua(124)}`;
    },
    "ponte-noite"(rnd) {
      const p = ponte(720, 90, 14, 340, 15);
      let luzes = "";
      for (let x = 160; x < 1290; x += 26) luzes += `<circle cx="${x}" cy="89" r="1.6"/>`;
      return `<path d="${mata(rnd, 118, 18)}" fill="currentColor" fill-opacity=".8"/><path d="${p.c}" stroke="currentColor" stroke-width="1.2" fill="none"/>` +
        `<path d="${p.d}" fill="currentColor"/><g fill="#E08A5B" fill-opacity=".9">${luzes}</g>${agua(124)}`;
    },
  };

  document.querySelectorAll(".horizonte[data-tipo]").forEach((el, i) => {
    const tipo = el.dataset.tipo;
    const corpo = DESENHOS[tipo](aleatorio(7919 * (i + 3)));
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" focusable="false">${corpo}</svg>`;
  });
})();
