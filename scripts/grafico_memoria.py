
import csv
from pathlib import Path
import matplotlib.pyplot as plt

# Pasta dos testes, fora do repositorio
base = Path(__file__).resolve().parents[2] / "Testes_Elasticidade"
ficheiro = base / "Medicoes_Finais" / "resumo_recursos_processamento.csv"

memoria = {"B": [], "C": []}

with open(ficheiro, encoding="utf-8-sig", newline="") as f:
    for linha in csv.DictReader(f):
        cenario = linha["Teste"].split("_")[0]
        valor = float(linha["MemoriaMediaMiB"].replace(",", "."))
        memoria[cenario].append(valor)

repeticoes = range(1, 6)
media_b = sum(memoria["B"]) / 5
media_c = sum(memoria["C"]) / 5

fig, ax = plt.subplots(figsize=(10, 5.5))

largura = 0.35
pos_b = [x - largura / 2 for x in repeticoes]
pos_c = [x + largura / 2 for x in repeticoes]

ax.bar(
    pos_b, memoria["B"], largura,
    label=f"B - 1 réplica fixa (média: {media_b:.2f} MiB)".replace(".", ",")
)

ax.bar(
    pos_c, memoria["C"], largura,
    label=f"C - Autoscaling (média: {media_c:.2f} MiB)".replace(".", ",")
)

ax.set_title("Comparação da utilização média de memória")
ax.set_xlabel("Repetição")
ax.set_ylabel("Memória média durante o processamento (MiB)")
ax.set_xticks(list(repeticoes))
ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.15), ncol=2)
ax.grid(axis="y", alpha=0.2)

fig.tight_layout()

destino = base / "Graficos" / "comparacao_memoria_B_C.png"
fig.savefig(destino, dpi=200)
plt.close(fig)

print(f"Gráfico guardado em: {destino}")
