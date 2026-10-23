"""Copia, renomeia e redimensiona as fotos de imagens_iranduba/ para site/assets/img/.

Gera .webp e .jpg em 640 / 1080 / 1600 px de largura, só até a largura original
(sem upscaling). Uso:  python scripts/build_imagens.py
"""
import json
from pathlib import Path

from PIL import Image, ImageOps

RAIZ = Path(__file__).resolve().parent.parent
ORIG = RAIZ / "imagens_iranduba"
DEST = RAIZ / "site" / "assets" / "img"
LARGURAS = [640, 1080, 1600]

MAPA = {
    "Ponte_Rio_Negro_-_Amazonas_-_Brasil.jpg": "hero-ponte-rio-negro",
    "Vista_aérea_da_ponte_sobre_o_rio_Negro_que_liga_Manaus_a_Iranduba.jpg": "fechamento-vista-aerea",
    "Vista_aerea_do_porto_rodoviario_de_Iranduba_(AM).jpg": "cidade-casas-flutuantes",  # Wikimedia Commons, CC BY 2.0
    "Árvore_Poderosa.jpg": "raizes-arvore-ruina",
    "Ponte_Rio_Negro_AM.jpg": "crescimento-ponte-entardecer",
}

DEST.mkdir(parents=True, exist_ok=True)
manifesto = {}
for orig, novo in MAPA.items():
    im = ImageOps.exif_transpose(Image.open(ORIG / orig)).convert("RGB")
    w0, h0 = im.size
    larguras = [w for w in LARGURAS if w < w0] + [min(w0, LARGURAS[-1])]
    larguras = sorted(set(larguras))
    for w in larguras:
        h = round(h0 * w / w0)
        r = im if w == w0 else im.resize((w, h), Image.LANCZOS)
        r.save(DEST / f"{novo}-{w}.webp", "WEBP", quality=78, method=6)
        r.save(DEST / f"{novo}-{w}.jpg", "JPEG", quality=80, optimize=True, progressive=True)
    manifesto[novo] = {"original": orig, "largura": w0, "altura": h0, "larguras": larguras}
    print(f"{orig} -> {novo} {larguras}")

(RAIZ / "site" / "data" / "imagens.json").write_text(json.dumps(manifesto, ensure_ascii=False, indent=1), encoding="utf-8")
