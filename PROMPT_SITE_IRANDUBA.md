# PROMPT — Painel "Iranduba em números" (Censo 2022)

> Cole tudo abaixo da linha em uma nova sessão (Claude Code, Claude ou outra ferramenta de código).
> Antes, deixe estes arquivos acessíveis à sessão: `censo_unificado.csv`, `Relatorio_Censo_Iranduba_v6.pdf` (ou `.docx`), a pasta `imagens_iranduba/` e, se já existir, `creditos_imagens.txt`.

---

## 1. Papel e objetivo

Você é um(a) designer-desenvolvedor(a) front-end com sensibilidade editorial e de visualização de dados. Construa **um site de página única, em formato de painel narrativo, que apresenta o Censo Demográfico 2022 de Iranduba (AM) em comparação com Manaus**, para um público leigo. O site é a entrega de uma disciplina de Estatística (apresentação e defesa individual), então:

- cada número exibido tem de poder ser **rastreado até uma tabela** e **bater com o relatório técnico** (seção 3 deste prompt);
- cada seção responde **uma pergunta**, com **um gráfico**, **um número em destaque** e **no máximo duas frases** de leitura;
- onde o dado não prova causa, o texto diz isso (o relatório faz o mesmo).

Município em foco: **Iranduba (AM), código IBGE 1301852**. Comparação: **Manaus (AM), 1302603**.

## 2. Ordem de trabalho (não pule etapas)

1. **Leia o relatório** `Relatorio_Censo_Iranduba_v6` por inteiro, em especial as seções 3 (modelagem), 5 (resultados), 7 (conclusão/limitações) e a Tabela 16. Ele é a **fonte de verdade para textos, interpretações, ressalvas e arredondamentos**.
2. **Gere `data/dados.json`** a partir de `censo_unificado.csv` com um script (`scripts/build_dados.py`), conforme a seção 4. O site **nunca** lê o CSV de 28 MB e **nunca** tem número digitado à mão no HTML.
3. **Rode os testes de reconciliação** (seção 4.4). Só avance se todos passarem.
4. **Prepare as imagens** (seção 5): copiar, renomear, redimensionar, gerar `creditos.json`.
5. **Construa o site** (seções 6 a 9).
6. **Verifique**: screenshots em 390 px e 1440 px, teste de números, acessibilidade (seção 10).
7. Entregue um resumo curto com: o que foi feito, o que ficou pendente (créditos de imagem, por exemplo) e como publicar.

Se algo neste prompt contradizer o relatório, **vale o relatório**; avise na entrega.

## 3. Base de conteúdo: o relatório

Resumo do que o relatório afirma (use para escrever as legendas curtas; confira a redação original antes de resumir):

| Item do enunciado | Seção do relatório | Mensagem central |
|---|---|---|
| A. População | 5.1 | 61.163 pessoas: 31.364 homens (51,3%) e 29.799 mulheres (48,7%). Crianças (0–9) 11.126 e adolescentes (10–19) 11.301 somam 22.427, 36,7%. |
| B. Crescimento | 5.2 | De 18.876 (1991) para 61.163 (2022). 3,44% ao ano entre 2010 e 2022, cerca de 3,0 vezes Manaus (1,14%). A ponte (aberta em out/2011) é **hipótese plausível**, não causa demonstrada. |
| C. Sexo | 5.3 | Razão de sexos 105,25 (Manaus 93,80). Na infância (0–14) é 102,0, normal ao nascer; o excedente masculino **surge na vida adulta** (113,2 aos 45–59; 116,5 aos 60–74). |
| D. Pirâmide | 5.4 | Mediana 28 anos (Manaus 30), índice de envelhecimento 37,4 (Manaus 41,2), razão de dependência 51,4. Distância entre as pirâmides: dissimilaridade 6,6%. |
| E. Cor ou raça | 5.5 | 76,3% pardos. Composição mudou pouco desde 2010 (dissimilaridade 3,6%), mas as contagens de pretos e indígenas cresceram mais que a população. |
| F. Alfabetização | 5.6 | 91,14% (Manaus 97,02%). |
| G. Urbano/rural | 5.7 | 76,3% urbano, 23,7% rural (Manaus 0,97%). 18.684 pessoas em favelas e comunidades urbanas (30,5%, **calculado pelo autor**). |
| H. Sexo × cor | 5.8 | Razão de sexos entre pretos 152,0 (Manaus 129,4), a mais alta entre os grupos. |
| I. Alfabetização × sexo × cor | 5.9 | Mulheres 92,21% × homens 90,13%; anos de estudo 9,4 × 8,5. Pretos 86,09% e indígenas 86,46%, cerca de 6 pontos abaixo dos brancos (92,29%). |
| J. Deficiência e autismo | 5.10 | Deficiência 8,1% (Manaus 7,4%); autismo 1,2% (Manaus 1,3%). Analfabetismo entre pessoas com deficiência 22,34%, cerca de 3,3 vezes o das pessoas sem deficiência (6,71%). Resultados **amostrais e preliminares**. |
| K. Composição domiciliar | 5.11 | 17.812 domicílios; média 3,43 moradores (Manaus 3,27); 34,9% sem cônjuge do responsável (Manaus 44,5%); 49,2% chefiados por mulheres (Manaus 53,6%). |

**Limitações que o site precisa mostrar** (seção 7.2 do relatório): grupos amarelo e indígena são pequenos; cor ou raça é autodeclarada (2010 × 2022 mistura mudança de composição com autoidentificação); o Censo é retrato, não prova causa; deficiência, autismo e média de moradores por cor ou idade vêm da amostra, sem margem de erro e sem padronização por idade; as contagens por cor da Tabela 10147 diferem das da 9606.

## 4. Fonte de dados dos gráficos

### 4.1 Arquivo

`censo_unificado.csv` — formato longo, UTF-8 com BOM (`encoding="utf-8-sig"`), 78.032 linhas, 22 colunas:
`fonte, zip_origem, arquivo_csv, status, indicador, nivel_territorial, territorio, uf, cod_municipio, foco, ano, dim1_nome, dim1_valor, dim2_nome, dim2_valor, dim3_nome, dim3_valor, variavel, valor_texto, valor_num, linha_origem, coluna_origem`

Regras de leitura (todas obrigatórias):

1. Use sempre **`valor_num`** (nunca `valor_texto`, que tem vírgula decimal).
2. Filtre **`status == "ativo"`**. As linhas `substituído` são de um envio antigo e incompleto.
3. Filtre `territorio` em `{"Iranduba","Manaus"}` e `nivel_territorial == "Município"`. Linhas de "Brasil e Grande Região" existem em algumas tabelas SIDRA (9543, 9877, 10147) e servem apenas de contexto.
4. A mesma tabela SIDRA pode ter **vários blocos** distintos pela coluna `variavel` (contagem, com deficiência, percentual). **Sempre filtre por `variavel`**, senão você soma coisas diferentes.
5. **Pirâmide etária (Panorama):** nessas linhas `territorio` vem como `"Total"` e `cod_municipio` como `"AM"`. Identifique o município pelo nome do arquivo (`arquivo_csv` contém "Iranduba" ou "Manaus").
6. Valores ausentes (`-` no SIDRA) ficam com `valor_num` vazio. Não transforme em zero; mostre "sem registro".
7. Iranduba não tem população em 1970 e 1980 no arquivo. O gráfico histórico começa em 1991; **não interpole**.
8. Nunca misture a Tabela 9606 (contagens por cor) com a 10147 (autismo por cor): os totais por cor diferem (relatório, 7.2 f).
9. Em Manaus, a soma das cores na 9606 difere do total em 73 pessoas (diferença já existente no arquivo do IBGE). Use os mesmos percentuais da Tabela 4 do relatório.

### 4.2 Dicionário: onde buscar cada visual

| Seção do site | Visual | `indicador` (começa com / igual a) | Filtro (`dim*` / `variavel`) | Observação |
|---|---|---|---|---|
| População | cartões de total e sexo | Panorama `População por sexo` | `dim1_valor` = Homens/Mulheres; `variavel` = "População(pessoas)" e "Percentual" | confere com 9606 Total |
| População | crianças e adolescentes | Panorama `Pirâmide etária` (arquivo Iranduba) | crianças = faixas "0 a 4" + "5 a 9" (11.126); adolescentes = "10 a 14" + "15 a 19" (11.301) | cortes do relatório (5.1) |
| Crescimento | linha 1991–2022 | Panorama `População Residente` | `ano` 1991, 2000, 2010, 2022 | começa em 1991 |
| Crescimento | taxa por período | derivado | `(P1/P0)^(1/n) − 1`, n = 9, 10, 12 | dá 6,15; 2,36; 3,44 (seção 3.1 do relatório) |
| Crescimento | taxa oficial | Panorama `Taxa de crescimento anual` | `ano` 2022 | 3,44 e 1,14 |
| Sexo e pirâmide | pirâmide, 21 faixas | Panorama `Pirâmide etária` | `variavel` = "População masculina(pessoas)" / "População feminina(pessoas)" | usar arquivo para separar municípios |
| Sexo e pirâmide | razão de sexos total e índice de envelhecimento | Panorama `Razão de sexo e índice de envelhecimento` | — | 105,25 / 93,80 e 37,4 / 41,2 |
| Sexo e pirâmide | razão por faixa | derivado da pirâmide | homens ÷ mulheres × 100 | tabela 3 do relatório |
| Cor ou raça | distribuição 2010 e 2022 | Panorama `População por cor ou raça` | `dim1_valor` = cor; `variavel` começa com "2010 " ou "2022 " (ex.: "2022 População (pessoas)") | Iranduba 2010 × 2022 |
| Cor ou raça | Iranduba × Manaus 2022 | `Tabela 9606` | `dim1_valor`="Total", `dim2_valor`=cor, `dim3_valor`="Total" | percentual = cor ÷ total |
| Cor ou raça | idade mediana | Panorama `Idade mediana por cor ou raça` | `dim1_valor` = cor | 25 (branca), 36 (preta), 40 (amarela), 27 (parda), 26 (indígena) |
| Cor ou raça | razão de sexos por cor | `Tabela 9606` | `dim2_valor`=cor, `dim3_valor`=Homens/Mulheres | pretos 152,0 × 129,4 |
| Educação | taxa geral | Panorama `Alfabetização` | `variavel`="Percentual" | 91,14 / 97,02 |
| Educação | sexo × cor | `Tabela 9543` | `dim2_valor`=sexo, `dim3_valor`=cor, `dim1_valor`="Total" | taxa de 15 anos ou mais |
| Educação | anos de estudo | Panorama `Número médio de anos de estudo, por sexo` | só Iranduba | 8,5 (H) e 9,4 (M) |
| Urbano e rural | urbano × rural | Panorama `Situação do domicílio` | `variavel`="Percentual" e "População (pessoas)" | 76,26 / 23,74 e 99,03 / 0,97 |
| Urbano e rural | favelas | Panorama `População em favelas` e `Número de favelas` | — | 18.684 pessoas (30,5% = 18.684 ÷ 61.163); 11 favelas |
| Urbano e rural | alfabetização em favelas | Panorama `Porcentagem de alfabetizados na população total e em favelas` | `dim1_valor` | 91,14 total e 91,33 em favelas |
| Deficiência e autismo | por sexo | Panorama `Deficiência, por sexo` e `Autismo, por sexo` | só Iranduba | 7,9/8,4 e 1,4/1,1 |
| Deficiência e autismo | analfabetismo | Panorama `Taxa de analfabetismo de pessoas com deficiência` | só Iranduba | 22,34 × 6,71 |
| Deficiência e autismo | por cor | `Tabela 10126` | `variavel` = "…com deficiência (Pessoas)", "…(Pessoas)" e "Percentual…(%)" | 4.777 de 58.967 = 8,1%; **amarela: 23 casos em 79, não confiável** |
| Deficiência e autismo | autismo por cor | `Tabela 10147` (fonte `SIDRA (API)`) | `dim1_valor` = cor; `variavel` contém "diagnosticada" e "Percentual" | 763 casos, 1,2% (Manaus 1,3%) |
| Casa e família | média de moradores | `Tabela 9877` (fonte `SIDRA (API)`) | `dim1_valor`="Total" (idade), `dim3_valor`="Total" (cor), `dim2_valor`=sexo | 3,43 / 3,27; H 3,13 e M 3,73 |
| Casa e família | média por cor e idade | `Tabela 9877` | idem, variando cor e idade | amostral |
| Casa e família | presença de cônjuge | `Tabela 9881` | `variavel` = "Domicílios particulares (Domicílios)" | 17.812 e 6.214 sem cônjuge (34,9%) |
| Casa e família | composição por sexo do responsável | `Tabela 9882` | `variavel` = "Domicílios particulares (Domicílios)"; `dim1_valor`=sexo; `dim2_valor`=composição | percentual **dentro de cada sexo** = contagem ÷ total do sexo (ex.: mulheres sem cônjuge com filhos = 24,5% dos domicílios chefiados por mulheres; 12,1% é a parcela do total) |
| Síntese | tabela comparativa | todos acima | — | reproduzir a Tabela 16 do relatório |

> Há outros indicadores no CSV (unidades de conservação, entorno dos domicílios, migração, nascimentos, nacionalidade etc.). **Não os use** sem avisar: eles não estão no relatório e, portanto, não têm análise nem ressalva. Se quiser um deles como destaque opcional, rotule "extra, fora do relatório" e me pergunte antes.

### 4.3 Estrutura de `dados.json`

Um objeto por seção, com campos já calculados, arredondados como no relatório e acompanhados de **proveniência**:

```json
{
  "populacao": {
    "total": {"valor": 61163, "fonte": "Panorama · População por sexo / SIDRA 9606", "tabela": "9606"},
    "homens": {...}, "mulheres": {...}
  },
  "serie_populacao": {"anos": [1991,2000,2010,2022], "iranduba": [...], "manaus": [...]},
  "piramide": {"faixas": [...21...], "iranduba": {"H": [...], "M": [...]}, "manaus": {"H": [...], "M": [...]}},
  "...": "..."
}
```

Cada gráfico exibe, em um "Sobre estes dados" recolhível: tabela de valores, `fonte` (ex.: "IBGE, Censo 2022, SIDRA Tabela 9543"), nota amostral quando houver e botão "baixar CSV deste gráfico".

### 4.4 Testes de reconciliação (obrigatórios; falhar = parar)

O script deve imprimir uma tabela "esperado × obtido" e abortar se algum valor divergir:

| Item | Iranduba | Manaus |
|---|---|---|
| População 2022 | 61.163 | 2.063.689 |
| Homens / Mulheres | 31.364 / 29.799 | 998.842 / 1.064.847 |
| População 1991, 2000, 2010 | 18.876; 32.303; 40.781 | 1.011.501; 1.405.835; 1.802.014 |
| Taxa de crescimento (% a.a.) | 3,44 | 1,14 |
| Razão de sexos | 105,25 | 93,80 |
| Índice de envelhecimento | 37,4 | 41,2 |
| Idade mediana | 28 | 30 |
| Alfabetização 15+ (%) | 91,14 | 97,02 |
| Alfabetização, pessoas pretas (%) | 86,09 | 95,23 |
| Urbana / Rural (%) | 76,26 / 23,74 | 99,03 / 0,97 |
| Pessoas em favelas | 18.684 (30,5%) | 1.151.828 |
| Pessoas de 2+ anos / com deficiência | 58.967 / 4.777 (8,1%) | — / 7,4% |
| Autismo (%) | 1,2 (763 casos) | 1,3 |
| Razão de sexos, pessoas pretas | 152,0 (2.117 H / 1.393 M) | 129,4 |
| Domicílios / sem cônjuge | 17.812 / 6.214 (34,9%) | 630.577 / 280.694 (44,5%) |
| Média de moradores | 3,43 (H 3,13; M 3,73) | 3,27 |
| Dissimilaridade (pirâmides; cor 2010×2022; cor Iranduba×Manaus) | 6,6%; 3,6%; 7,4% | — |

Além disso: soma da pirâmide = população total; soma das cores (9606) = total em Iranduba; Homens + Mulheres = Total em cada composição (9882).

> Um teste no navegador (Playwright) deve extrair todos os números exibidos com `data-ref="chave"` e compará-los a `dados.json`. Número no DOM sem `data-ref` = falha.

## 5. Imagens

Pasta `imagens_iranduba/` (5 fotos; a da vitória-régia foi descartada de propósito, não use). **Não faça upscaling.** Renomeie para nomes ASCII e gere `.webp` + `.jpg` em larguras 640 / 1080 / 1600 (apenas até a largura original).

| Arquivo original | Nome novo | Resolução | Papel no site |
|---|---|---|---|
| `Ponte_Rio_Negro_-_Amazonas_-_Brasil.jpg` | `hero-ponte-rio-negro` | 1600×1071 | **Abertura (hero)**, tela cheia. Água escura combina com a base da paleta. Sobreposição em gradiente de baixo para cima para o título. |
| `Vista_aérea_da_ponte_sobre_o_rio_Negro_que_liga_Manaus_a_Iranduba.jpg` | `fechamento-vista-aerea` | 1800×1198 | **Fechamento** (seção 8), tela cheia com duotone. É a de maior resolução, e o bloco de estética pede "rios na abertura e no fechamento". |
| `b2ap3_large_Iranduba3.jpeg` | `cidade-casas-flutuantes` | 1080×638 | Seções **Urbano e rural** e **Casa e família**. Usar **emoldurada** (máx. ~1080 px, não tela cheia), com recortes diferentes em cada seção. |
| `Árvore_Poderosa.jpg` | `raizes-arvore-ruina` | 1536×2048 (vertical) | Seção **Cor ou raça**, como painel lateral vertical ("raízes"). **Não legendar com nome de local** enquanto não houver confirmação; use legenda neutra. |
| `Ponte_Rio_Negro_AM.jpg` | `crescimento-ponte-entardecer` | 1024×768 | Seção **População e crescimento** ("ponte ao entardecer para o crescimento"). Usar como **janela emoldurada** ao lado do gráfico (largura máx. 1024 px) e, no fundo, com multiply forte e leve desfoque. Nunca em tela cheia nítida. |

Seções **sem foto** (Sexo e pirâmide, Educação, Deficiência e autismo) usam a **faixa-horizonte vetorial** e os **grafismos cerâmicos** da seção 6.1. Não há foto de olaria nem de campo; se eu adicionar depois, entram nas seções 2 e 4 (chaminés) e 5 (campo).

**Créditos e licença (obrigatório):** crie `creditos.json` com `{arquivo, autor, licenca, fonte, url}` para cada imagem. Se o dado estiver faltando, mostre "Crédito pendente" **apenas em modo de desenvolvimento** e faça o build de produção **falhar** com a lista de imagens sem crédito. O rodapé lista todos os créditos. Lembrete: duas das fotos (`b2ap3_large_Iranduba3`, e eventualmente a árvore) têm origem sem licença confirmada; a pessoa responsável vai preencher.

**Acessibilidade das imagens:** `alt` descritivo, `loading="lazy"` (exceto o hero), `width/height` definidos, `fetchpriority="high"` no hero, `object-position` ajustado por seção.

## 6. Direção estética

O bloco abaixo é a **direção estética oficial** do site. Siga-o integralmente. A subseção 6.1 só traduz o bloco em decisões concretas e resolve conflitos com o restante deste prompt; **em caso de dúvida, vale o bloco**.

<frontend_aesthetics>
You are designing "Iranduba em números": a public-facing, single-page scrolling
dashboard about the 2022 Brazilian Census for Iranduba (Amazonas), compared with
Manaus. The audience is the general public, not statisticians. All visible text is
in Brazilian Portuguese. The site must feel like it could only belong to this place.

You tend to converge toward generic, "on distribution" outputs ("AI slop"). Avoid it.
Every choice below must come from Iranduba's identity, not from habit.

<place_identity>
Verified facts to design from:
- Nickname "Cidade das Chaminés": the largest red-ceramic (olaria) hub of Amazonas,
  built on local clay. Chimney silhouettes are the signature motif.
- The cable-stayed bridge over the Rio Negro (opened 2011) replaced a ~1 hour ferry.
  It is the visual symbol of the city's fast growth.
- The municipality sits between the dark Rio Negro and the muddy Rio Solimões.
  Two water colors side by side are the core palette idea.
- Archaeology: human occupation from ~7500 BC; ceramic-making peoples from ~300 BC
  until the 16th century; terra preta sites. Ceramic grafismos (incised/painted
  patterns) are the pattern language for textures and section dividers.
- Forest and campinarana, the AM-070 highway, orchards, vegetable farms and fish
  farms serving Manaus, and the ruins of Vila de Paricatuba on the Rio Negro bank.
Do NOT use the municipal coat of arms or flag. Do NOT invent facts about the city.
</place_identity>

<photos_and_imagery>
Use the supplied photographs of Iranduba as full-bleed section backgrounds and as
framed "windows" beside the data. Treat photos as atmosphere, never as clutter:
- Layer each photo under a duotone or multiply overlay in the palette so text and
  charts stay readable (check contrast; charts always sit on solid, light panels).
- Apply a different crop and tone per section: bridge at dusk for growth, olaria
  chimneys for education and work, rivers for opening and closing, fields for rural.
- Use slow parallax or a subtle scale-in on scroll; keep photos lazy-loaded and
  compressed. Add alt text describing each photo.
- If a photo is missing, fall back to original vector silhouettes (chimneys, bridge,
  river line, forest edge) drawn in CSS/SVG. Never hotlink random web images.
</photos_and_imagery>

Typography: Pick a distinctive pairing with regional character, for example a sturdy
slab or hand-cut display face that echoes stamped clay and brick lettering for
headlines, with a warm, highly readable humanist serif or sans for body text and a
tabular-figure face for numbers. Avoid Inter, Roboto, Arial, system fonts and
Space Grotesk. Big numbers are the heroes: oversized, tightly set, with short plain
captions.

Color & Theme: Commit to one cohesive theme defined as CSS variables.
Dominant: deep forest green and Rio Negro blue-black. Sharp accent: terracotta/kiln
red. Counter-tone: Solimões silt beige. Use terracota for Iranduba and blue-black
for Manaus consistently in every comparison chart. No purple gradients, no timid
evenly-spread palettes. Provide an accessible color-blind-safe pair for charts.

Motion: One orchestrated page-load sequence (staggered reveals with animation-delay:
sun-on-river light sweep, chimney smoke drifting up, headline numbers counting up),
then restrained scroll-triggered reveals per section. CSS-only where possible,
honor prefers-reduced-motion, and never animate in a way that hides the data.

Backgrounds: Create atmosphere and depth. Layer photo + gradient + ceramic-grafismo
pattern at low opacity, with a horizon strip (chimneys, bridge, forest line) that
changes subtly from section to section. A thin "two rivers" divider (dark and
barrenta water meeting in a wavy line) separates sections.

Layout & storytelling: Not a generic card grid. One scroll, one question per
section, in plain language, for example "Quantos somos e quão rápido crescemos?".
Each section has: a headline with the key number, one clear chart, one sentence
saying what it means, a Iranduba × Manaus toggle where comparison helps, and an
honest caution badge when data comes from a sample or a very small group.
Optional "saiba mais" drawer explains the technical term. Include a final section
on what the data cannot tell us.

Charts: Direct labels, axes starting at zero, large type, no chart junk, high
contrast on solid panels. Keep numbers identical to the report (single data source).

Avoid generic AI-generated aesthetics:
- Overused font families and default component libraries
- Clichéd color schemes (purple gradients on white)
- Predictable hero + three-card layouts
- Decoration unrelated to Iranduba
Interpret creatively and make unexpected choices that feel genuinely designed for
this city. Think outside the box and do not default to the same choices across
generations.
</frontend_aesthetics>

### 6.1 Como aplicar o bloco neste projeto

- **Tokens de cor (CSS variables), ponto de partida:** `--floresta #1F3D2B`, `--rio-negro #0B1820`, `--terracota #B5532E` (Iranduba), `--terracota-clara #E08A5B`, `--silte #E3D3B0` (Solimões), `--barrenta #B89A6A`, `--painel #F4ECDA` (painéis de gráfico). **Iranduba = terracota; Manaus = azul-negro `--rio-negro`**, em todos os gráficos. Valide: contraste ≥ 4,5:1 do texto e dos rótulos sobre `--painel`; o par terracota × azul-negro difere em luminosidade e em matiz (simule daltonismo e relate o resultado). Para cor ou raça, use uma paleta categórica daltônica-segura **sem** reutilizar terracota nem azul-negro.
- **Gráficos sempre em painéis sólidos claros** (`--painel`), por cima de foto, duotone ou fundo escuro. Nenhum gráfico direto sobre foto.
- **Tipografia:** escolha **um** par e justifique em duas linhas na entrega. Display: slab robusta ou de corte manual (candidatas: Rokkitt, Zilla Slab, Bevan, Alfa Slab One). Corpo: serifa humanista ou sans calorosa (candidatas: Literata, Source Serif 4). Números: fonte com algarismos tabulares (candidata: IBM Plex Mono, com `font-variant-numeric: tabular-nums`). Proibidas: Inter, Roboto, Arial, fontes de sistema, Space Grotesk. Autohospede e use subconjunto latino.
- **Abertura orquestrada:** sequência única ao carregar, na ordem: varredura de luz do sol sobre o rio, fumaça subindo das chaminés, título, números-herói contando. Depois, só revelações por rolagem, discretas. `prefers-reduced-motion` desliga tudo isso e mostra o estado final.
- **Divisor "dois rios":** SVG ondulado em que a água escura e a barrenta se encontram, entre todas as seções (altura ~40–80 px).
- **Faixa-horizonte vetorial por seção** (silhueta em SVG, muda sutilmente de uma seção para outra): 0 rios e ponte · 1 ponte · 2 chaminés de olaria com fumaça · 3 mata e campinarana · 4 chaminés de olaria (educação e trabalho) · 5 campos, pomares e palafitas · 6 mata, tom sóbrio · 7 palafitas e telhados · 8 rios e ponte ao anoitecer.
- **Grafismos cerâmicos:** padrões geométricos **originais**, inspirados em cerâmica incisa e pintada, em baixa opacidade, como textura de fundo e ornamento dos divisores. Não reproduza peças de museu nem motivos de obras específicas.
- **Fotos:** só as de `imagens_iranduba/` (seção 5), com duotone ou multiply na paleta, recortes e tons diferentes por seção, parallax lento ou *scale-in* sutil, alt descritivo. Onde falta foto (olaria, campo), use as silhuetas vetoriais acima.
- **Fatos sobre o lugar** (apelido "Cidade das Chaminés", ocupação arqueológica, balsa de cerca de 1 hora, ruínas de Paricatuba etc.) **são motivos visuais**. Só aparecem em texto visível se estiverem no relatório (hoje, o relatório traz a ponte aberta em outubro de 2011) ou vierem com fonte citada no rodapé. Sem fonte, não escreva. Não use brasão nem bandeira do município.

## 7. Estrutura narrativa (9 blocos, rolagem contínua)

Cada seção: **pergunta (título) → número-herói → gráfico → leitura (≤ 2 frases, ≤ 40 palavras) → selo de cautela, se houver → "Sobre estes dados"**. Textos curtos, em português do Brasil, sem jargão; quando usar um termo técnico (razão de sexos, mediana, dissimilaridade), explique em uma linha ("Saiba mais", gaveta recolhível).

| # | Seção / pergunta | Visual | Foto/fundo | Selo de cautela |
|---|---|---|---|---|
| 0 | **Abertura.** "Quem vive em Iranduba?" 61.163 pessoas, Censo 2022. | hero com contagem animada | `hero-ponte-rio-negro` | — |
| 1 | **População e crescimento.** "Quanto a cidade cresceu?" | linhas 1991–2022 (Iranduba × Manaus em índice 1991 = 100 e em valores absolutos, com alternador) + cartões de homens, mulheres, crianças, adolescentes | `crescimento-ponte-entardecer` (janela) + horizonte da ponte | "A ponte é hipótese, não causa" |
| 2 | **Sexo e pirâmide.** "Quem mora aqui: mais homens ou mulheres? Quantos jovens?" | pirâmide etária (alternador Iranduba/Manaus/sobrepor) + linha de razão de sexos por faixa | horizonte vetorial: chaminés com fumaça + grafismos | — |
| 3 | **Cor ou raça.** "Como as pessoas se identificam, e isso mudou?" | barras empilhadas 2010 × 2022 e Iranduba × Manaus; idade mediana por cor | `raizes-arvore-ruina` (lateral) | "Grupo pequeno" (amarela, 124 pessoas; indígena, 872); "autodeclarada" |
| 4 | **Educação.** "Quem sabe ler e escrever?" | barras de alfabetização por sexo e por cor (Iranduba × Manaus); anos de estudo | horizonte vetorial: olarias + grafismos | "Grupo pequeno" |
| 5 | **Urbano e rural.** "Onde as pessoas vivem?" | barra 100% urbano/rural + favelas | `cidade-casas-flutuantes` (moldura) + horizonte de campos e pomares | "30,5% calculado pelo autor" |
| 6 | **Deficiência e autismo.** "Quantas pessoas têm deficiência ou autismo?" | prevalência por sexo e por cor, com linha do total; barra de analfabetismo 22,34 × 6,71 | horizonte de mata, tom mais sóbrio | **Amostral/preliminar; sem margem de erro; amarela não confiável (23 casos); não padronizado por idade** |
| 7 | **Casa e família.** "Como são as famílias?" | média de moradores (H/M), % sem cônjuge, composição por sexo do responsável (barras 100% dentro de cada sexo) | `cidade-casas-flutuantes` (outro recorte) | "Média por cor e idade é amostral" |
| 8 | **Síntese e o que os dados não dizem.** | tabela comparativa (Tabela 16) + lista de limitações (7.2) + "para ir além" (7.3) | `fechamento-vista-aerea` | — |

**Rodapé:** fonte dos dados (IBGE, Censo Demográfico 2022, Panorama e SIDRA; tabelas 9606, 9543, 10126, 10147, 9877, 9881, 9882), data de acesso (22/10/2026), link/menção ao relatório, nome do autor (Alessandro de Oliveira Ramos), disciplina "Estatística Aplicada a Computadores", CIESA, créditos das fotos, aviso "Os números do site são idênticos aos do relatório".

## 8. Regras de visualização

- **Painéis:** todo gráfico fica em painel sólido claro (`--painel`); Iranduba = terracota, Manaus = azul-negro, sempre.
- **Honestidade do gráfico:** barras começam em zero; eixos rotulados; unidade sempre visível; rótulo direto nos elementos (evite legenda distante); dois municípios sempre com as mesmas cores (item 6).
- **Cores categóricas** (cor ou raça): paleta daltônica-segura, com rótulos, sem depender só de cor.
- **Grupos pequenos** (amarela e indígena, e qualquer célula com poucos casos): hachura ou ícone "!" e nota; nunca destacar como achado.
- **Toggle global** Iranduba · Manaus · Comparar; estado preservado ao rolar; quando só há dado de Iranduba (ex.: anos de estudo, deficiência por sexo), o controle mostra "só Iranduba" em vez de falhar.
- **Interações:** tooltip com valor exato e fonte; teclado acessível; foco visível; leitura por leitor de tela via `<table>` oculta ou `aria-label` com os valores.
- **Responsivo:** mobile primeiro (390 px), sem rolagem horizontal; gráficos recompõem (pirâmide vira vertical compacta se necessário).
- **Modo apresentação** (opcional, valioso para a defesa de 03/12): atalho que percorre as seções com as setas, escondendo menus.

## 9. Requisitos técnicos

- Site **estático** (HTML, CSS, JS), sem backend. Visualizações com **D3 (v7) ou Observable Plot**, versão fixada, servida localmente (sem CDN em produção) ou de CDN confiável com versão exata. Sem framework obrigatório.
- Estrutura sugerida:
  `site/index.html · assets/css/ · assets/js/ · assets/img/ (webp+jpg) · data/dados.json · data/creditos.json · scripts/build_dados.py · tests/`
- Peso: página inicial < 3 MB sem o hero; imagens responsivas (`srcset`/`sizes`); fontes com `font-display: swap` e subconjunto latino.
- Publicável como pasta estática (por exemplo, Vercel) **e** empacotável em um HTML único (≤ 16 MB, imagens embutidas) para compartilhar como artefato. Diga qual das duas foi gerada.
- Idioma `pt-BR`; metadados e Open Graph (usar o hero); `<title>` "Iranduba em números · Censo 2022".
- Contraste mínimo AA em todo texto, inclusive sobre fotos (use véu). Teste com 390 px e 1440 px.

## 10. Critérios de aceite

1. `build_dados.py` passa em **todos** os testes da seção 4.4.
2. Nenhum número no HTML sem `data-ref`; teste automatizado confirma coincidência com `dados.json`.
3. Todo número de destaque coincide com o relatório (conferido contra a lista da seção 3).
4. As ressalvas da seção 3 aparecem nas seções 1, 3, 4, 5, 6 e 7 (selos de cautela).
5. Nenhuma frase atribui causa (ex.: "a ponte causou"); use "pode ter", "é compatível com", "hipótese".
6. Screenshots 390 px e 1440 px de todas as seções, sem texto ilegível sobre foto, sem rolagem horizontal, sem sobreposição.
7. Build de produção falha se faltar crédito de imagem.
8. Lighthouse (ou equivalente): Acessibilidade ≥ 95; sem erros no console.
9. **Checklist de estética** (screenshot de cada item): abertura orquestrada (luz, fumaça, título, números); divisor "dois rios" entre seções; faixa-horizonte diferente em cada seção; grafismos cerâmicos em baixa opacidade; gráficos em painéis claros; terracota/azul-negro consistentes; tipografia fora da lista proibida; `prefers-reduced-motion` testado.
10. Entrega final em, no máximo, 10 linhas: o que foi feito, o que depende de mim (créditos, hospedagem), como rodar e publicar.

## 11. O que não fazer

- Não carregar o CSV de 28 MB no navegador.
- Não digitar números nos textos; sempre gerar a partir de `dados.json`.
- Não inventar dado, causa, nome de local de foto ou texto de crédito.
- Não usar a foto da vitória-régia nem imagens fora de `imagens_iranduba/` sem me avisar.
- Não usar indicadores fora do relatório sem rotular como "extra" e sem me consultar.
- Não usar o brasão nem a bandeira do município, nem copiar logos, personagens ou obras existentes nos elementos vetoriais.
- Não escrever em texto visível nenhum fato sobre o lugar (história, arqueologia, apelidos) que não esteja no relatório ou em fonte citada.
- Não usar a estética padrão de IA: Inter/Roboto/Arial/Space Grotesk, gradiente roxo, layout "hero + três cartões", cartões idênticos, decoração sem relação com Iranduba, emoji.
