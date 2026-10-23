"""Gera site/data/dados.json a partir de censo_unificado.csv.

Uso:  python scripts/build_dados.py
Aborta (exit 1) se algum teste de reconciliação (seção 4.4 do prompt) falhar.

Regras de leitura: valor_num, status == "ativo", nível Município,
território Iranduba/Manaus, sempre filtrando por `variavel`.
"""
import json
import math
import sys
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
CSV = RAIZ / "censo_unificado.csv"
SAIDA = RAIZ / "site" / "data" / "dados.json"

CORES = ["Branca", "Preta", "Amarela", "Parda", "Indígena"]
MUN = ["Iranduba", "Manaus"]

# ---------------------------------------------------------------- leitura
df = pd.read_csv(CSV, encoding="utf-8-sig", dtype=str)
df["valor_num"] = pd.to_numeric(df["valor_num"], errors="coerce")
df = df[df["status"] == "ativo"]
PAN = df[df["fonte"] == "Panorama"]
SID = df[(df["fonte"] != "Panorama") & (df["nivel_territorial"] == "Município")
         & (df["territorio"].isin(MUN))]


def pan(indicador, mun, **filtros):
    d = PAN[(PAN["indicador"] == indicador)]
    if indicador == "Pirâmide etária":
        d = d[d["arquivo_csv"].str.contains(mun)]
    else:
        d = d[d["territorio"] == mun]
    for k, v in filtros.items():
        d = d[d[k] == v]
    return d


def pan1(indicador, mun, **filtros):
    d = pan(indicador, mun, **filtros)
    assert len(d) == 1, (indicador, mun, filtros, len(d))
    v = d["valor_num"].iloc[0]
    return None if pd.isna(v) else float(v)


def sid(tabela, mun, **filtros):
    d = SID[SID["indicador"].str.startswith(f"Tabela {tabela} ") & (SID["territorio"] == mun)]
    for k, v in filtros.items():
        if k == "variavel_contem":
            d = d[d["variavel"].str.contains(v, regex=False)]
        else:
            d = d[d[k] == v]
    return d


def sid1(tabela, mun, **filtros):
    d = sid(tabela, mun, **filtros)
    assert len(d) == 1, (tabela, mun, filtros, len(d))
    v = d["valor_num"].iloc[0]
    return None if pd.isna(v) else float(v)


def r(x, casas):
    """Arredondamento 'meio para cima' (como no relatório), não o bancário."""
    if x is None:
        return None
    f = 10 ** casas
    v = math.floor(abs(x) * f + 0.5 + 1e-9) / f
    v = math.copysign(v, x)
    return int(v) if casas == 0 else v


def dissim(p, q):
    sp, sq = sum(p), sum(q)
    return 50 * sum(abs(a / sp - b / sq) for a, b in zip(p, q))


# ---------------------------------------------------------------- refs
REFS = {}
F_PAN = "IBGE, Censo Demográfico 2022, Panorama"


def ref(chave, valor, casas=0, fonte=F_PAN, unidade="", nota=None):
    REFS[chave] = {"v": r(valor, casas) if valor is not None else None,
                   "c": casas, "u": unidade, "f": fonte}
    if nota:
        REFS[chave]["n"] = nota
    return REFS[chave]["v"]


def fs(t, api=False):
    return f"IBGE, Censo Demográfico 2022, SIDRA Tabela {t}" + (" (API)" if api else "")


G = {}  # dados dos gráficos

# ================================================================ A. população
for m in MUN:
    k = m.lower()
    tot = sid1("9606", m, dim1_valor="Total", dim2_valor="Total", dim3_valor="Total")
    h = pan1("População por sexo", m, dim1_valor="Homens", variavel="População(pessoas)")
    mu = pan1("População por sexo", m, dim1_valor="Mulheres", variavel="População(pessoas)")
    ref(f"{k}.pop", tot, 0, "IBGE, Censo 2022, Panorama · População por sexo / SIDRA 9606")
    ref(f"{k}.homens", h, 0, F_PAN + " · População por sexo")
    ref(f"{k}.mulheres", mu, 0, F_PAN + " · População por sexo")
    ref(f"{k}.homens_pct", h / tot * 100, 1, F_PAN + " · População por sexo", "%")
    ref(f"{k}.mulheres_pct", mu / tot * 100, 1, F_PAN + " · População por sexo", "%")

# pirâmide (Panorama, separando o município pelo nome do arquivo)
FAIXAS = [f"{i} a {i + 4} anos" for i in range(0, 100, 5)] + ["100 anos ou mais"]
PIR = {}
for m in MUN:
    d = pan("Pirâmide etária", m)
    H = [float(d[(d.dim1_valor == f) & (d.variavel == "População masculina(pessoas)")].valor_num.iloc[0]) for f in FAIXAS]
    M = [float(d[(d.dim1_valor == f) & (d.variavel == "População feminina(pessoas)")].valor_num.iloc[0]) for f in FAIXAS]
    PIR[m] = (H, M)


def faixa(m, a0, a1):
    H, M = PIR[m]
    h = sum(H[i] for i in range(21) if a0 <= i * 5 < a1)
    mu = sum(M[i] for i in range(21) if a0 <= i * 5 < a1)
    return h, mu, h + mu


GRUPOS = [("criancas", "Crianças (0 a 9 anos)", 0, 10), ("adolescentes", "Adolescentes (10 a 19 anos)", 10, 20),
          ("adultos", "Adultos (20 a 59 anos)", 20, 60), ("idosos", "Idosos (60 anos ou mais)", 60, 200)]
tot_i = REFS["iranduba.pop"]["v"]
fp = F_PAN + " · Pirâmide etária"
for g, _, a0, a1 in GRUPOS:
    h, mu, t = faixa("Iranduba", a0, a1)
    ref(f"iranduba.{g}", t, 0, fp)
    ref(f"iranduba.{g}_h", h, 0, fp)
    ref(f"iranduba.{g}_m", mu, 0, fp)
    ref(f"iranduba.{g}_pct", t / tot_i * 100, 1, fp, "%")
ca = REFS["iranduba.criancas"]["v"] + REFS["iranduba.adolescentes"]["v"]
ref("iranduba.criancas_adolescentes", ca, 0, fp)
ref("iranduba.criancas_adolescentes_pct", ca / tot_i * 100, 1, fp, "%")
G["grupos_etarios"] = {
    "fonte": fp, "colunas": ["Grupo", "Homens", "Mulheres", "Total", "% do total"],
    "linhas": [[rot, REFS[f"iranduba.{g}_h"]["v"], REFS[f"iranduba.{g}_m"]["v"], REFS[f"iranduba.{g}"]["v"],
                REFS[f"iranduba.{g}_pct"]["v"]] for g, rot, _, _ in GRUPOS]}

# ================================================================ B. crescimento
ANOS = [1991, 2000, 2010, 2022]
serie = {}
for m in MUN:
    d = pan("População Residente", m)
    serie[m] = [float(d[d.ano == str(a)].valor_num.iloc[0]) for a in ANOS]
    for a, v in zip(ANOS, serie[m]):
        ref(f"{m.lower()}.pop_{a}", v, 0, F_PAN + " · População Residente")
    for (a0, p0), (a1, p1) in zip(zip(ANOS, serie[m]), list(zip(ANOS, serie[m]))[1:]):
        ref(f"{m.lower()}.taxa_{a0}_{a1}", ((p1 / p0) ** (1 / (a1 - a0)) - 1) * 100, 2,
            F_PAN + " · População Residente; cálculo do autor (taxa geométrica)", "% a.a.")
    ref(f"{m.lower()}.taxa_oficial", pan1("Taxa de crescimento anual", m, ano="2022"), 2,
        F_PAN + " · Taxa de crescimento anual", "% a.a.")
ti, tm = REFS["iranduba.taxa_oficial"]["v"], REFS["manaus.taxa_oficial"]["v"]
ref("crescimento.vezes_manaus", ti / tm, 1, "Cálculo do autor (3,44 ÷ 1,14)", " vezes")
si = serie["Iranduba"]
ref("iranduba.var_2010_2022_pct", (si[3] / si[2] - 1) * 100, 1, F_PAN + "; cálculo do autor", "%")
ref("iranduba.var_2010_2022_abs", si[3] - si[2], 0, F_PAN + "; cálculo do autor")
ref("iranduba.vezes_1991", si[3] / si[0], 1, F_PAN + "; cálculo do autor", " vezes")
G["serie_populacao"] = {
    "fonte": F_PAN + " · População Residente (Censos 1991 a 2022)",
    "nota": "Iranduba não tem população em 1970 e 1980 no arquivo; a série começa em 1991, sem interpolação.",
    "anos": ANOS,
    "iranduba": [int(v) for v in serie["Iranduba"]], "manaus": [int(v) for v in serie["Manaus"]],
    "indice_iranduba": [r(v / serie["Iranduba"][0] * 100, 1) for v in serie["Iranduba"]],
    "indice_manaus": [r(v / serie["Manaus"][0] * 100, 1) for v in serie["Manaus"]],
    "taxas_iranduba": [None] + [REFS[f"iranduba.taxa_{a}_{b}"]["v"] for a, b in zip(ANOS, ANOS[1:])],
    "taxas_manaus": [None] + [REFS[f"manaus.taxa_{a}_{b}"]["v"] for a, b in zip(ANOS, ANOS[1:])],
}

# ================================================================ C/D. sexo e pirâmide
for m in MUN:
    k = m.lower()
    ref(f"{k}.razao_sexos", pan1("Razão de sexo e índice de envelhecimento", m,
                                  variavel="homens para cada 100 mulheres"), 2,
        F_PAN + " · Razão de sexo e índice de envelhecimento")
    ref(f"{k}.ind_envelhecimento", pan1("Razão de sexo e índice de envelhecimento", m,
                                         variavel="pessoas com 60+ anos para cada 100 com até 14 anos"), 1,
        F_PAN + " · Razão de sexo e índice de envelhecimento")
    ref(f"{k}.mediana", pan1("Idade mediana por cor ou raça", m, dim1_valor="Total"), 0,
        F_PAN + " · Idade mediana por cor ou raça", " anos")

GR_RAZAO = [("0 a 14 anos", 0, 15), ("15 a 29 anos", 15, 30), ("30 a 44 anos", 30, 45),
            ("45 a 59 anos", 45, 60), ("60 a 74 anos", 60, 75), ("75 anos ou mais", 75, 200)]
razoes = {m: [] for m in MUN}
for m in MUN:
    for rot, a0, a1 in GR_RAZAO:
        h, mu, _ = faixa(m, a0, a1)
        razoes[m].append(r(h / mu * 100, 1))
for i, (rot, _, _) in enumerate(GR_RAZAO):
    ref(f"iranduba.razao_faixa_{i}", razoes["Iranduba"][i], 1, fp + "; cálculo do autor")
    ref(f"manaus.razao_faixa_{i}", razoes["Manaus"][i], 1, F_PAN + " · Pirâmide etária (Manaus); cálculo do autor")
h60, m60, _ = faixa("Iranduba", 60, 200)
ref("iranduba.razao_idosos", h60 / m60 * 100, 1, fp + "; cálculo do autor")

p014 = faixa("Iranduba", 0, 15)[2]
p1564 = faixa("Iranduba", 15, 65)[2]
p65 = faixa("Iranduba", 65, 200)[2]
ref("iranduba.pct_0_14", p014 / tot_i * 100, 1, fp + "; cálculo do autor", "%")
ref("iranduba.pct_15_64", p1564 / tot_i * 100, 1, fp + "; cálculo do autor", "%")
ref("iranduba.pct_65", p65 / tot_i * 100, 1, fp + "; cálculo do autor", "%")
ref("iranduba.razao_dependencia", (p014 + p65) / p1564 * 100, 1, fp + "; cálculo do autor")
pi = PIR["Iranduba"][0] + PIR["Iranduba"][1]
pm = PIR["Manaus"][0] + PIR["Manaus"][1]
ref("dissim.piramides", dissim(pi, pm), 1, F_PAN + " · Pirâmide etária; cálculo do autor", "%")

G["piramide"] = {
    "fonte": F_PAN + " · Pirâmide etária (arquivos de Iranduba e de Manaus)",
    "faixas": FAIXAS,
    "iranduba": {"H": [int(v) for v in PIR["Iranduba"][0]], "M": [int(v) for v in PIR["Iranduba"][1]]},
    "manaus": {"H": [int(v) for v in PIR["Manaus"][0]], "M": [int(v) for v in PIR["Manaus"][1]]},
}
G["razao_faixa"] = {
    "fonte": F_PAN + " · Pirâmide etária; cálculo do autor (homens ÷ mulheres × 100)",
    "grupos": [g[0] for g in GR_RAZAO], "iranduba": razoes["Iranduba"], "manaus": razoes["Manaus"],
}

# ================================================================ E. cor ou raça
c10 = [pan1("População por cor ou raça", "Iranduba", dim1_valor=c, variavel="2010 População (pessoas)") for c in CORES]
c22 = [pan1("População por cor ou raça", "Iranduba", dim1_valor=c, variavel="2022 População (pessoas)") for c in CORES]
c9606 = {m: [sid1("9606", m, dim1_valor="Total", dim2_valor=c, dim3_valor="Total") for c in CORES] for m in MUN}
fc = F_PAN + " · População por cor ou raça"
for c, a, b, mm in zip(CORES, c10, c22, c9606["Manaus"]):
    ck = c.lower().replace("í", "i")
    ref(f"iranduba.cor_{ck}_2010", a, 0, fc)
    ref(f"iranduba.cor_{ck}_2022", b, 0, fc)
    ref(f"iranduba.cor_{ck}_2010_pct", a / sum(c10) * 100, 1, fc + "; cálculo do autor", "%")
    ref(f"iranduba.cor_{ck}_2022_pct", b / sum(c22) * 100, 1, fc + "; cálculo do autor", "%")
    ref(f"manaus.cor_{ck}_2022_pct", mm / sum(c9606["Manaus"]) * 100, 1, fs("9606") + "; cálculo do autor", "%")
ref("iranduba.preta_vezes", c22[1] / c10[1], 1, fc + "; cálculo do autor", " vezes")
ref("dissim.cor_2010_2022", dissim(c10, c22), 1, fc + "; cálculo do autor", "%")
ref("dissim.cor_iranduba_manaus", dissim(c9606["Iranduba"], c9606["Manaus"]), 1, fs("9606") + "; cálculo do autor", "%")
G["cor"] = {
    "fonte": fc + " (Iranduba 2010 e 2022); " + fs("9606") + " (Manaus 2022)",
    "nota": "Percentuais sobre a soma das cinco categorias. Cor ou raça é autodeclarada.",
    "cores": CORES,
    "iranduba_2010": [int(v) for v in c10], "iranduba_2022": [int(v) for v in c22],
    "manaus_2022": [int(v) for v in c9606["Manaus"]],
    "pequenos": ["Amarela", "Indígena"],
}
G["mediana_cor"] = {
    "fonte": F_PAN + " · Idade mediana por cor ou raça", "cores": CORES,
    "iranduba": [r(pan1("Idade mediana por cor ou raça", "Iranduba", dim1_valor=c), 0) for c in CORES],
    "manaus": [r(pan1("Idade mediana por cor ou raça", "Manaus", dim1_valor=c), 0) for c in CORES],
}
for c, v in zip(CORES, G["mediana_cor"]["iranduba"]):
    ref(f"iranduba.mediana_{c.lower().replace('í', 'i')}", v, 0, G["mediana_cor"]["fonte"], " anos")

# ================================================================ H. sexo × cor
rs_cor = {}
for m in MUN:
    rs_cor[m] = []
    for c in ["Total"] + CORES:
        h = sid1("9606", m, dim1_valor="Total", dim2_valor=c, dim3_valor="Homens")
        mu = sid1("9606", m, dim1_valor="Total", dim2_valor=c, dim3_valor="Mulheres")
        rs_cor[m].append({"cor": c, "H": int(h), "M": int(mu), "razao": r(h / mu * 100, 2)})
ref("iranduba.pretos_h", rs_cor["Iranduba"][2]["H"], 0, fs("9606"))
ref("iranduba.pretos_m", rs_cor["Iranduba"][2]["M"], 0, fs("9606"))
ref("iranduba.razao_pretos", rs_cor["Iranduba"][2]["H"] / rs_cor["Iranduba"][2]["M"] * 100, 1, fs("9606") + "; cálculo do autor")
ref("manaus.razao_pretos", rs_cor["Manaus"][2]["H"] / rs_cor["Manaus"][2]["M"] * 100, 1, fs("9606") + "; cálculo do autor")
ref("iranduba.pretas_mulheres_pct", rs_cor["Iranduba"][2]["M"] / (rs_cor["Iranduba"][2]["H"] + rs_cor["Iranduba"][2]["M"]) * 100, 1, fs("9606") + "; cálculo do autor", "%")
G["razao_cor"] = {"fonte": fs("9606") + "; cálculo do autor (homens ÷ mulheres × 100)",
                  "iranduba": rs_cor["Iranduba"], "manaus": rs_cor["Manaus"]}

# ================================================================ F/I. educação
for m in MUN:
    k = m.lower()
    ref(f"{k}.alfab", pan1("Alfabetização", m, dim1_valor="Alfabetizados", variavel="Percentual"), 2,
        F_PAN + " · Alfabetização", "%")
    ref(f"{k}.nao_alfab", pan1("Alfabetização", m, dim1_valor="Não alfabetizados", variavel="Percentual"), 2,
        F_PAN + " · Alfabetização", "%")
    ref(f"{k}.alfab_favelas", pan1("Porcentagem de alfabetizados na população total e em favelas", m,
                                    dim1_valor="Em favelas"), 2, F_PAN + " · Alfabetizados em favelas", "%")
ref("iranduba.alfabetizados", pan1("Alfabetização", "Iranduba", dim1_valor="Alfabetizados", variavel="População(pessoas)"), 0, F_PAN + " · Alfabetização")
ref("iranduba.nao_alfabetizados", pan1("Alfabetização", "Iranduba", dim1_valor="Não alfabetizados", variavel="População(pessoas)"), 0, F_PAN + " · Alfabetização")
ref("iranduba.pop15", REFS["iranduba.alfabetizados"]["v"] + REFS["iranduba.nao_alfabetizados"]["v"], 0, F_PAN + " · Alfabetização")
ref("educacao.dif_pp", REFS["manaus.alfab"]["v"] - REFS["iranduba.alfab"]["v"], 2, "Cálculo do autor", " p.p.")
ref("educacao.vezes_nao_alfab", REFS["iranduba.nao_alfab"]["v"] / REFS["manaus.nao_alfab"]["v"], 1, "Cálculo do autor", " vezes")

alf = {}
for m in MUN:
    alf[m] = {s: [sid1("9543", m, dim1_valor="Total", dim2_valor=s, dim3_valor=c) for c in ["Total"] + CORES]
              for s in ["Total", "Homens", "Mulheres"]}
for s, sk in [("Total", "t"), ("Homens", "h"), ("Mulheres", "m")]:
    for c, v in zip(["Total"] + CORES, alf["Iranduba"][s]):
        ref(f"iranduba.alfab_{sk}_{c.lower().replace('í', 'i')}", v, 2, fs("9543"), "%")
for c, v in zip(["Total"] + CORES, alf["Manaus"]["Total"]):
    ref(f"manaus.alfab_t_{c.lower().replace('í', 'i')}", v, 2, fs("9543"), "%")
ref("manaus.alfab_h_total", alf["Manaus"]["Homens"][0], 2, fs("9543"), "%")
ref("manaus.alfab_m_total", alf["Manaus"]["Mulheres"][0], 2, fs("9543"), "%")
ref("educacao.vantagem_mulheres", alf["Iranduba"]["Mulheres"][0] - alf["Iranduba"]["Homens"][0], 2, fs("9543") + "; cálculo do autor", " p.p.")
ref("educacao.gap_pretas", alf["Iranduba"]["Total"][1] - alf["Iranduba"]["Total"][2], 1, fs("9543") + "; cálculo do autor", " p.p.")
ref("educacao.gap_indigenas", alf["Iranduba"]["Total"][1] - alf["Iranduba"]["Total"][5], 1, fs("9543") + "; cálculo do autor", " p.p.")
G["alfab_cor"] = {"fonte": fs("9543") + " (taxa das pessoas de 15 anos ou mais)",
                  "nota": "Taxas não padronizadas por idade.", "grupos": ["Total"] + CORES,
                  "iranduba": {s: alf["Iranduba"][s] for s in alf["Iranduba"]},
                  "manaus": {s: alf["Manaus"][s] for s in alf["Manaus"]}, "pequenos": ["Amarela", "Indígena"]}
for s in ["Homens", "Mulheres"]:
    ref(f"iranduba.anos_estudo_{s[0].lower()}", pan1("Número médio de anos de estudo, por sexo", "Iranduba", dim1_valor=s), 1,
        F_PAN + " · Número médio de anos de estudo, por sexo", " anos")

# ================================================================ G. urbano/rural
for m in MUN:
    k = m.lower()
    for s in ["Urbana", "Rural"]:
        ref(f"{k}.{s.lower()}_pct", pan1("Situação do domicílio", m, dim1_valor=s, variavel="Percentual"), 2,
            F_PAN + " · Situação do domicílio", "%")
        ref(f"{k}.{s.lower()}", pan1("Situação do domicílio", m, dim1_valor=s, variavel="População (pessoas)"), 0,
            F_PAN + " · Situação do domicílio")
    ref(f"{k}.favelas_pop", pan1("População em favelas", m, dim1_valor="População residente em favelas"), 0,
        F_PAN + " · População em favelas")
    ref(f"{k}.favelas_n", pan1("Número de favelas", m), 0, F_PAN + " · Número de favelas")
ref("iranduba.urbana_pct1", REFS["iranduba.urbana_pct"]["v"], 1, F_PAN + " · Situação do domicílio", "%")
ref("iranduba.rural_pct1", REFS["iranduba.rural_pct"]["v"], 1, F_PAN + " · Situação do domicílio", "%")
ref("manaus.urbana_pct1", REFS["manaus.urbana_pct"]["v"], 1, F_PAN + " · Situação do domicílio", "%")
ref("iranduba.favelas_pct", REFS["iranduba.favelas_pop"]["v"] / tot_i * 100, 1,
    F_PAN + " · População em favelas; percentual calculado pelo autor", "%",
    nota="O arquivo do IBGE não traz o percentual; 18.684 ÷ 61.163.")

# ================================================================ J. deficiência e autismo
ref("iranduba.def_h", pan1("Deficiência, por sexo", "Iranduba", dim1_valor="Homens"), 1, F_PAN + " · Deficiência, por sexo", "%")
ref("iranduba.def_m", pan1("Deficiência, por sexo", "Iranduba", dim1_valor="Mulheres"), 1, F_PAN + " · Deficiência, por sexo", "%")
ref("iranduba.aut_h", pan1("Autismo, por sexo", "Iranduba", dim1_valor="Homens"), 1, F_PAN + " · Autismo, por sexo", "%")
ref("iranduba.aut_m", pan1("Autismo, por sexo", "Iranduba", dim1_valor="Mulheres"), 1, F_PAN + " · Autismo, por sexo", "%")
ref("iranduba.aut_razao_sexo", REFS["iranduba.aut_h"]["v"] / REFS["iranduba.aut_m"]["v"], 1, "Cálculo do autor", "")
ad = pan1("Taxa de analfabetismo de pessoas com deficiência", "Iranduba", variavel="Taxa de analfabetismo de pessoas com deficiência (%)")
asd = pan1("Taxa de analfabetismo de pessoas com deficiência", "Iranduba", variavel="Taxa de analfabetismo de pessoas sem deficiência (%)")
ref("iranduba.analf_com_def", ad, 2, F_PAN + " · Taxa de analfabetismo de pessoas com deficiência", "%")
ref("iranduba.analf_sem_def", asd, 2, F_PAN + " · Taxa de analfabetismo de pessoas com deficiência", "%")
ref("deficiencia.vezes_analf", ad / asd, 1, "Cálculo do autor", " vezes")

V_POP2 = "Pessoas de 2 anos ou mais de idade (Pessoas)"
V_DEF = "Pessoas de 2 anos ou mais de idade com deficiência (Pessoas)"
V_DEFP = "Percentual de pessoas de 2 anos ou mais de idade com deficiência no total pessoas de 2 anos ou mais de idade (%)"
deff = {}
for m in MUN:
    deff[m] = [{"cor": c, "pop": sid1("10126", m, dim1_valor=c, variavel=V_POP2),
                "casos": sid1("10126", m, dim1_valor=c, variavel=V_DEF),
                "pct": sid1("10126", m, dim1_valor=c, variavel=V_DEFP)} for c in ["Total"] + CORES]
ref("iranduba.pop2", deff["Iranduba"][0]["pop"], 0, fs("10126"))
ref("iranduba.def_casos", deff["Iranduba"][0]["casos"], 0, fs("10126"))
for m in MUN:
    for row in deff[m]:
        ref(f"{m.lower()}.def_{row['cor'].lower().replace('í', 'i')}", row["pct"], 1, fs("10126"), "%")
ref("iranduba.def_amarela_casos", deff["Iranduba"][3]["casos"], 0, fs("10126"))
ref("iranduba.def_amarela_pop", deff["Iranduba"][3]["pop"], 0, fs("10126"))
G["deficiencia_cor"] = {"fonte": fs("10126"), "nota": "Resultados preliminares da amostra, sem margem de erro e sem padronização por idade. Amarela: apenas 23 casos em 79 pessoas — não confiável.",
                        "iranduba": [{k: (int(v) if isinstance(v, float) and k != "pct" else v) for k, v in x.items()} for x in deff["Iranduba"]],
                        "manaus": [{k: (int(v) if isinstance(v, float) and k != "pct" else v) for k, v in x.items()} for x in deff["Manaus"]],
                        "nao_confiavel": ["Amarela"]}

V_AP = "População residente (Pessoas)"
V_AC = "População residente diagnosticada com autismo (Pessoas)"
V_APC = "Percentual da população residente diagnosticada com autismo no total da população residente (%)"
aut = {}
for m in MUN:
    aut[m] = [{"cor": c, "pop": sid1("10147", m, dim1_valor=c, variavel=V_AP),
               "casos": sid1("10147", m, dim1_valor=c, variavel=V_AC),
               "pct": sid1("10147", m, dim1_valor=c, variavel=V_APC)} for c in ["Total"] + CORES]
ref("iranduba.aut_casos", aut["Iranduba"][0]["casos"], 0, fs("10147", True))
for m in MUN:
    for row in aut[m]:
        ref(f"{m.lower()}.aut_{row['cor'].lower().replace('í', 'i')}", row["pct"], 1, fs("10147", True), "%")
ref("iranduba.aut_pretas_casos", aut["Iranduba"][2]["casos"], 0, fs("10147", True))
G["autismo_cor"] = {"fonte": fs("10147", True), "nota": "Resultados da amostra. “Sem registro” = o IBGE não registra casos na célula, o que não prova ausência. Não comparar contagens com a Tabela 9606.",
                    "iranduba": [{k: (int(v) if isinstance(v, float) and k != "pct" else v) for k, v in x.items()} for x in aut["Iranduba"]],
                    "manaus": [{k: (int(v) if isinstance(v, float) and k != "pct" else v) for k, v in x.items()} for x in aut["Manaus"]]}

# ================================================================ K. casa e família
V_DOM = "Domicílios particulares (Domicílios)"
CONJ = ["Domicílio com responsável e cônjuge de sexo diferente", "Domicílio com responsável e cônjuge de mesmo sexo", "Domicílio sem cônjuge"]
CONJ_ROT = ["Com cônjuge de sexo diferente", "Com cônjuge do mesmo sexo", "Sem cônjuge"]
conj = {}
for m in MUN:
    k = m.lower()
    t = sid1("9881", m, dim1_valor="Total", variavel=V_DOM)
    conj[m] = [sid1("9881", m, dim1_valor=c, variavel=V_DOM) for c in CONJ]
    ref(f"{k}.domicilios", t, 0, fs("9881"))
    ref(f"{k}.sem_conjuge", conj[m][2], 0, fs("9881"))
    ref(f"{k}.sem_conjuge_pct", conj[m][2] / t * 100, 1, fs("9881") + "; cálculo do autor", "%")
    ref(f"{k}.mesmo_sexo", conj[m][1], 0, fs("9881"))
    ref(f"{k}.mesmo_sexo_pct", conj[m][1] / t * 100, 2, fs("9881") + "; cálculo do autor", "%")
    ref(f"{k}.sexo_dif_pct", conj[m][0] / t * 100, 1, fs("9881") + "; cálculo do autor", "%")
G["conjuge"] = {"fonte": fs("9881"), "categorias": CONJ_ROT,
                "iranduba": [int(v) for v in conj["Iranduba"]], "manaus": [int(v) for v in conj["Manaus"]]}

COMP = ["Domicílio com responsável, cônjuge e sem filhos", "Domicílio com responsável e cônjuge com filho de ambos somente",
        "Domicílio com responsável e cônjuge com pelo menos um filho somente do responsável ou somente do cônjuge",
        "Domicílio com responsável sem cônjuge com filho(s) e/ou enteado(s)", "Domicílio com outros tipos de composição"]
COMP_ROT = ["Casal sem filhos", "Casal com filho de ambos", "Casal com filho de um só", "Sem cônjuge, com filhos ou enteados", "Outros tipos"]
comp = {}
for m in MUN:
    comp[m] = {s: [sid1("9882", m, dim1_valor=s, dim2_valor=c, variavel=V_DOM) for c in COMP] for s in ["Total", "Homens", "Mulheres"]}
    comp[m]["tot"] = {s: sid1("9882", m, dim1_valor=s, dim2_valor="Total", variavel=V_DOM) for s in ["Total", "Homens", "Mulheres"]}
    k = m.lower()
    ref(f"{k}.chefia_mulher_pct", comp[m]["tot"]["Mulheres"] / comp[m]["tot"]["Total"] * 100, 1, fs("9882") + "; cálculo do autor", "%")
    ref(f"{k}.chefia_homem_pct", comp[m]["tot"]["Homens"] / comp[m]["tot"]["Total"] * 100, 1, fs("9882") + "; cálculo do autor", "%")
    ref(f"{k}.casal_filhos_pct", (comp[m]["Total"][1] + comp[m]["Total"][2]) / comp[m]["tot"]["Total"] * 100, 1, fs("9882") + "; cálculo do autor", "%")
    ref(f"{k}.mono_fem_pct", comp[m]["Mulheres"][3] / comp[m]["tot"]["Total"] * 100, 1, fs("9882") + "; cálculo do autor (parcela do total)", "%")
    ref(f"{k}.mono_fem_dentro_pct", comp[m]["Mulheres"][3] / comp[m]["tot"]["Mulheres"] * 100, 1, fs("9882") + "; cálculo do autor (dentro dos chefiados por mulheres)", "%")
    ref(f"{k}.mono_masc_dentro_pct", comp[m]["Homens"][3] / comp[m]["tot"]["Homens"] * 100, 1, fs("9882") + "; cálculo do autor (dentro dos chefiados por homens)", "%")
G["composicao"] = {"fonte": fs("9882"), "nota": "Percentual dentro de cada sexo da pessoa responsável (contagem ÷ total do sexo).",
                   "categorias": COMP_ROT,
                   "iranduba": {"Homens": [int(v) for v in comp["Iranduba"]["Homens"]], "Mulheres": [int(v) for v in comp["Iranduba"]["Mulheres"]],
                                "tot_h": int(comp["Iranduba"]["tot"]["Homens"]), "tot_m": int(comp["Iranduba"]["tot"]["Mulheres"])},
                   "manaus": {"Homens": [int(v) for v in comp["Manaus"]["Homens"]], "Mulheres": [int(v) for v in comp["Manaus"]["Mulheres"]],
                              "tot_h": int(comp["Manaus"]["tot"]["Homens"]), "tot_m": int(comp["Manaus"]["tot"]["Mulheres"])}}

IDADES = ["Até 17 anos", "18 a 24 anos", "25 a 39 anos", "40 a 59 anos", "60 anos ou mais"]
mor = {}
for m in MUN:
    mor[m] = {
        "total": {s: sid1("9877", m, dim1_valor="Total", dim2_valor=s, dim3_valor="Total") for s in ["Total", "Homens", "Mulheres"]},
        "cor": {s: [sid1("9877", m, dim1_valor="Total", dim2_valor=s, dim3_valor=c) for c in CORES] for s in ["Total", "Homens", "Mulheres"]},
        "idade": {s: [sid1("9877", m, dim1_valor=i, dim2_valor=s, dim3_valor="Total") for i in IDADES] for s in ["Total", "Homens", "Mulheres"]},
    }
    k = m.lower()
    ref(f"{k}.moradores", mor[m]["total"]["Total"], 2, fs("9877", True))
ref("iranduba.moradores_h", mor["Iranduba"]["total"]["Homens"], 2, fs("9877", True) + " / Panorama")
ref("iranduba.moradores_m", mor["Iranduba"]["total"]["Mulheres"], 2, fs("9877", True) + " / Panorama")
ref("iranduba.moradores_dif_pct", (mor["Iranduba"]["total"]["Mulheres"] / mor["Iranduba"]["total"]["Homens"] - 1) * 100, 1, "Cálculo do autor", "%")
G["moradores"] = {"fonte": fs("9877", True), "nota": "Média por cor ou raça e por idade vem da amostra, sem margem de erro. Amarela: grupo pequeno, poucos domicílios.",
                  "cores": CORES, "idades": IDADES,
                  "iranduba": mor["Iranduba"], "manaus": mor["Manaus"], "pequenos": ["Amarela"]}

# ================================================================ síntese (Tabela 16)
G["sintese"] = {"fonte": "IBGE, Censo Demográfico 2022 (Panorama e SIDRA); elaboração própria", "linhas": [
    ["População residente", "iranduba.pop", "manaus.pop"],
    ["Crescimento 2010–2022 (% ao ano)", "iranduba.taxa_oficial", "manaus.taxa_oficial"],
    ["Razão de sexos (homens por 100 mulheres)", "iranduba.razao_sexos", "manaus.razao_sexos"],
    ["Índice de envelhecimento", "iranduba.ind_envelhecimento", "manaus.ind_envelhecimento"],
    ["Idade mediana (anos)", "iranduba.mediana", "manaus.mediana"],
    ["Taxa de alfabetização (15 anos ou mais, %)", "iranduba.alfab", "manaus.alfab"],
    ["População em área urbana (%)", "iranduba.urbana_pct1", "manaus.urbana_pct1"],
    ["População parda (%)", "iranduba.cor_parda_2022_pct", "manaus.cor_parda_2022_pct"],
    ["Razão de sexos entre pessoas pretas", "iranduba.razao_pretos", "manaus.razao_pretos"],
    ["Alfabetização das pessoas pretas (%)", "iranduba.alfab_t_preta", "manaus.alfab_t_preta"],
    ["Pessoas com deficiência, 2 anos ou mais (%)", "iranduba.def_total", "manaus.def_total"],
    ["Pessoas com diagnóstico de autismo (%)", "iranduba.aut_total", "manaus.aut_total"],
    ["Média de moradores por domicílio", "iranduba.moradores", "manaus.moradores"],
    ["Domicílios sem cônjuge do responsável (%)", "iranduba.sem_conjuge_pct", "manaus.sem_conjuge_pct"],
    ["Domicílios chefiados por mulheres (%)", "iranduba.chefia_mulher_pct", "manaus.chefia_mulher_pct"],
]}

# ================================================================ reconciliação
V = lambda k: REFS[k]["v"]  # noqa: E731
ESPERADO = [
    ("População 2022 – Iranduba", V("iranduba.pop"), 61163), ("População 2022 – Manaus", V("manaus.pop"), 2063689),
    ("Homens – Iranduba", V("iranduba.homens"), 31364), ("Mulheres – Iranduba", V("iranduba.mulheres"), 29799),
    ("Homens – Manaus", V("manaus.homens"), 998842), ("Mulheres – Manaus", V("manaus.mulheres"), 1064847),
    ("Crianças 0–9 – Iranduba", V("iranduba.criancas"), 11126), ("Adolescentes 10–19 – Iranduba", V("iranduba.adolescentes"), 11301),
    ("Crianças+adolescentes %", V("iranduba.criancas_adolescentes_pct"), 36.7),
    ("Pop. 1991 – Iranduba", V("iranduba.pop_1991"), 18876), ("Pop. 2000 – Iranduba", V("iranduba.pop_2000"), 32303),
    ("Pop. 2010 – Iranduba", V("iranduba.pop_2010"), 40781),
    ("Pop. 1991 – Manaus", V("manaus.pop_1991"), 1011501), ("Pop. 2000 – Manaus", V("manaus.pop_2000"), 1405835),
    ("Pop. 2010 – Manaus", V("manaus.pop_2010"), 1802014),
    ("Taxa 1991–2000 – Iranduba (calc.)", V("iranduba.taxa_1991_2000"), 6.15), ("Taxa 2000–2010 – Iranduba (calc.)", V("iranduba.taxa_2000_2010"), 2.36),
    ("Taxa 2010–2022 – Iranduba (calc.)", V("iranduba.taxa_2010_2022"), 3.44),
    ("Taxa oficial – Iranduba", V("iranduba.taxa_oficial"), 3.44), ("Taxa oficial – Manaus", V("manaus.taxa_oficial"), 1.14),
    ("Taxa 2010–2022 – Manaus (calc.)", V("manaus.taxa_2010_2022"), 1.14),
    ("Vezes Manaus", V("crescimento.vezes_manaus"), 3.0),
    ("Razão de sexos – Iranduba", V("iranduba.razao_sexos"), 105.25), ("Razão de sexos – Manaus", V("manaus.razao_sexos"), 93.80),
    ("Razão 0–14 – Iranduba", V("iranduba.razao_faixa_0"), 102.0), ("Razão 45–59 – Iranduba", V("iranduba.razao_faixa_3"), 113.2),
    ("Razão 60–74 – Iranduba", V("iranduba.razao_faixa_4"), 116.5), ("Razão 75+ – Manaus", V("manaus.razao_faixa_5"), 60.6),
    ("Razão idosos 60+ – Iranduba", V("iranduba.razao_idosos"), 115.0),
    ("Índice de envelhecimento – Iranduba", V("iranduba.ind_envelhecimento"), 37.4), ("Índice de envelhecimento – Manaus", V("manaus.ind_envelhecimento"), 41.2),
    ("Idade mediana – Iranduba", V("iranduba.mediana"), 28), ("Idade mediana – Manaus", V("manaus.mediana"), 30),
    ("Razão de dependência – Iranduba", V("iranduba.razao_dependencia"), 51.4),
    ("% 0–14 / 15–64 / 65+", (V("iranduba.pct_0_14"), V("iranduba.pct_15_64"), V("iranduba.pct_65")), (27.4, 66.1, 6.5)),
    ("Alfabetização 15+ – Iranduba", V("iranduba.alfab"), 91.14), ("Alfabetização 15+ – Manaus", V("manaus.alfab"), 97.02),
    ("Alfabetização pretas – Iranduba", V("iranduba.alfab_t_preta"), 86.09), ("Alfabetização pretas – Manaus", V("manaus.alfab_t_preta"), 95.23),
    ("Alfabetização H / M – Iranduba", (V("iranduba.alfab_h_total"), V("iranduba.alfab_m_total")), (90.13, 92.21)),
    ("Alfabetização indígenas / brancas", (V("iranduba.alfab_t_indigena"), V("iranduba.alfab_t_branca")), (86.46, 92.29)),
    ("Anos de estudo H / M", (V("iranduba.anos_estudo_h"), V("iranduba.anos_estudo_m")), (8.5, 9.4)),
    ("Urbana / Rural – Iranduba", (V("iranduba.urbana_pct"), V("iranduba.rural_pct")), (76.26, 23.74)),
    ("Urbana / Rural – Manaus", (V("manaus.urbana_pct"), V("manaus.rural_pct")), (99.03, 0.97)),
    ("Favelas – Iranduba", (V("iranduba.favelas_pop"), V("iranduba.favelas_pct")), (18684, 30.5)),
    ("Favelas – Manaus", V("manaus.favelas_pop"), 1151828),
    ("Pessoas 2+ / com deficiência / %", (V("iranduba.pop2"), V("iranduba.def_casos"), V("iranduba.def_total")), (58967, 4777, 8.1)),
    ("Deficiência % – Manaus", V("manaus.def_total"), 7.4),
    ("Analfabetismo com / sem deficiência", (V("iranduba.analf_com_def"), V("iranduba.analf_sem_def"), V("deficiencia.vezes_analf")), (22.34, 6.71, 3.3)),
    ("Autismo % / casos – Iranduba", (V("iranduba.aut_total"), V("iranduba.aut_casos")), (1.2, 763)),
    ("Autismo % – Manaus", V("manaus.aut_total"), 1.3),
    ("Razão de sexos pretas – Iranduba", (V("iranduba.razao_pretos"), V("iranduba.pretos_h"), V("iranduba.pretos_m")), (152.0, 2117, 1393)),
    ("Razão de sexos pretas – Manaus", V("manaus.razao_pretos"), 129.4),
    ("Domicílios / sem cônjuge / % – Iranduba", (V("iranduba.domicilios"), V("iranduba.sem_conjuge"), V("iranduba.sem_conjuge_pct")), (17812, 6214, 34.9)),
    ("Domicílios / sem cônjuge / % – Manaus", (V("manaus.domicilios"), V("manaus.sem_conjuge"), V("manaus.sem_conjuge_pct")), (630577, 280694, 44.5)),
    ("Chefiados por mulheres – I / M", (V("iranduba.chefia_mulher_pct"), V("manaus.chefia_mulher_pct")), (49.2, 53.6)),
    ("Mulher sem cônjuge c/ filhos: dentro / do total", (V("iranduba.mono_fem_dentro_pct"), V("iranduba.mono_fem_pct")), (24.5, 12.1)),
    ("Casal com filhos – I / M", (V("iranduba.casal_filhos_pct"), V("manaus.casal_filhos_pct")), (47.3, 41.0)),
    ("Média de moradores – I / M", (V("iranduba.moradores"), V("manaus.moradores")), (3.43, 3.27)),
    ("Média de moradores H / M – Iranduba", (V("iranduba.moradores_h"), V("iranduba.moradores_m")), (3.13, 3.73)),
    ("Dissimilaridade pirâmides", V("dissim.piramides"), 6.6), ("Dissimilaridade cor 2010×2022", V("dissim.cor_2010_2022"), 3.6),
    ("Dissimilaridade cor Iranduba×Manaus", V("dissim.cor_iranduba_manaus"), 7.4),
    ("Parda 2022 % – I / M", (V("iranduba.cor_parda_2022_pct"), V("manaus.cor_parda_2022_pct")), (76.3, 69.6)),
]
# somas de controle
for m in MUN:
    ESPERADO.append((f"Soma da pirâmide = população – {m}", sum(PIR[m][0]) + sum(PIR[m][1]), V(f"{m.lower()}.pop")))
ESPERADO.append(("Soma das cores (9606) = total – Iranduba", sum(c9606["Iranduba"]), V("iranduba.pop")))
ESPERADO.append(("Soma das cores (9606) – Manaus (diferença de 73 do IBGE)", V("manaus.pop") - sum(c9606["Manaus"]), 73))
ESPERADO.append(("Soma das cores 2010 = pop. 2010", sum(c10), V("iranduba.pop_2010")))
for m in MUN:
    ok = all(a + b == t for a, b, t in zip(comp[m]["Homens"], comp[m]["Mulheres"], comp[m]["Total"]))
    ESPERADO.append((f"9882 Homens + Mulheres = Total – {m}", ok, True))
    ESPERADO.append((f"9882 soma das composições = domicílios – {m}", sum(comp[m]["Total"]), V(f"{m.lower()}.domicilios")))


def igual(a, b):
    if isinstance(a, tuple):
        return all(igual(x, y) for x, y in zip(a, b))
    if isinstance(a, bool) or isinstance(b, bool):
        return a == b
    return a is not None and abs(float(a) - float(b)) < 1e-6


falhas = 0
print(f"{'item':60} {'esperado':>28} {'obtido':>28}  ok")
for nome, obtido, esp in ESPERADO:
    ok = igual(obtido, esp)
    falhas += not ok
    print(f"{nome:60} {str(esp):>28} {str(obtido):>28}  {'✓' if ok else '✗ FALHOU'}")
if falhas:
    print(f"\n{falhas} teste(s) falharam. dados.json NÃO foi gerado.")
    sys.exit(1)

SAIDA.parent.mkdir(parents=True, exist_ok=True)
out = {"gerado_de": "censo_unificado.csv (status = ativo)", "acesso": "22/10/2026", "refs": REFS, "graficos": G}
SAIDA.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":"), default=float), encoding="utf-8")
print(f"\nTodos os {len(ESPERADO)} testes passaram. {len(REFS)} refs → {SAIDA.relative_to(RAIZ)} ({SAIDA.stat().st_size // 1024} KB)")
