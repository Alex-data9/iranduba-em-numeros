"""Capturas de tela (Edge headless) de cada seção em 390 px e 1440 px.

Uso (com o servidor local rodando em http://127.0.0.1:4173):
    python tests/capturas.py
Saída: tests/capturas/<largura>-<secao>.png
"""
import subprocess
import sys
import tempfile
from pathlib import Path

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4173/"
SECOES = ["abertura", "crescimento", "piramide", "cor", "educacao", "territorio", "deficiencia", "familias", "sintese"]
SAIDA = Path(__file__).resolve().parent / "capturas"
SAIDA.mkdir(exist_ok=True)

for largura, altura in [(1440, 2200), (390, 3600)]:
    for secao in SECOES:
        arq = SAIDA / f"{largura}-{secao}.png"
        with tempfile.TemporaryDirectory() as perfil:
            subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--user-data-dir={perfil}",
                            f"--window-size={largura},{altura}", "--virtual-time-budget=8000",
                            f"--screenshot={arq}", f"{URL}#{secao}"], check=True, capture_output=True, timeout=120)
        print(arq.name)
