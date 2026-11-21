
import csv
from pathlib import Path
import matplotlib.pyplot as plt

# Pasta dos testes, fora do repositorio
base = Path(__file__).resolve().parents[2] / "Testes_Elasticidade"
ficheiro = base / "Medicoes_Finais" / "resumo_tempos.csv"

tempos = {"B": [], "C": []}

with open(ficheiro, encoding="utf-8-sig", newline="") as f:
    for linha in csv.DictReader(f):
        cenario = linha["Teste"].split("_")[0]
        tempo = float(linha["DuracaoSegundos"].replace(",", "."))
        tempos[cenario].append(tempo)

repeticoes = range(1, 6)
media_b = sum(tempos["B"]) / 5
media_c = sum(tempos["C"]) / 5

fig, ax = plt.subplots(figsize=(10, 5.5))

largura = 0.35
pos_b = [x - largura / 2 for x in repeticoes]
pos_c = [x + largura / 2 for x in repeticoes]

ax.bar(
    pos_b, tempos["B"], largura,
    label=f"B - 1 réplica fixa (média: {media_b:.2f} s)".replace(".", ",")
)

ax.bar(
    pos_c, tempos["C"], largura,
    label=f"C - Autoscaling (média: {media_c:.2f} s)".replace(".", ",")
)

ax.set_title("Comparacao dos tempos de processamento")
ax.set_xlabel("Repeticao")
ax.set_ylabel("Tempo de processamento (s)")
ax.set_xticks(list(repeticoes))
ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.15), ncol=2)
ax.grid(axis="y", alpha=0.2)

fig.tight_layout()

destino = base / "Graficos" / "comparacao_tempos_B_C.png"
fig.savefig(destino, dpi=200)
plt.close(fig)

print(f"Grafico guardado em: {destino}")
