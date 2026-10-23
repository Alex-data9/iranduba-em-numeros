// Build de produção: falha se alguma imagem usada no site não tiver crédito completo.
// Uso: node scripts/check_creditos.mjs   (é o "buildCommand" do Vercel)
import { readFileSync } from "node:fs";

const site = new URL("../site/", import.meta.url);
const creditos = JSON.parse(readFileSync(new URL("data/creditos.json", site), "utf8"));
const html = readFileSync(new URL("index.html", site), "utf8");
const js = readFileSync(new URL("assets/js/app.js", site), "utf8");

const usados = new Set([...(html + js).matchAll(/assets\/img\/([a-z-]+?)-\d+\.(?:webp|jpg)/g)].map((m) => m[1]));
const CAMPOS = ["autor", "licenca", "fonte", "url"];
const pendentes = [];
for (const nome of usados) {
  const c = creditos.find((x) => x.arquivo === nome);
  const faltam = c ? CAMPOS.filter((k) => !c[k]) : CAMPOS;
  if (faltam.length) pendentes.push(`  - ${nome} (falta: ${faltam.join(", ")})`);
}
if (pendentes.length) {
  console.error("✗ Build interrompido: imagens sem crédito completo em site/data/creditos.json:\n" + pendentes.join("\n"));
  process.exit(1);
}
console.log(`✓ Créditos completos para ${usados.size} imagens.`);
