import csv
from pathlib import Path
import matplotlib.pyplot as plt

base = Path(__file__).resolve().parent
ficheiro = base / "Medicoes_Finais" / "resumo_recursos_ABC.csv"

memoria = {"A": [], "B": [], "C": []}

with open(ficheiro, encoding="utf-8-sig", newline="") as f:
    for linha in csv.DictReader(f):
        cenario = linha["Teste"].split("_")[0]
        valor = float(linha["MemoriaMediaMiB"].replace(",", "."))
        memoria[cenario].append(valor)

fig, ax = plt.subplots(figsize=(10, 5.5))

repeticoes = range(1, 6)
largura = 0.25

for deslocamento, cenario, nome in [
    (-largura, "A", "Arquitetura original"),
    (0, "B", "1 replica fixa"),
    (largura, "C", "Autoscaling")
]:
    media = sum(memoria[cenario]) / len(memoria[cenario])
    posicoes = [x + deslocamento for x in repeticoes]

    ax.bar(
        posicoes, memoria[cenario], largura,
        label=f"{cenario} - {nome} (media: {media:.2f} MiB)"
    )

ax.set_title("Comparacao da utilizacao media de memoria - A/B/C")
ax.set_xlabel("Repeticao")
ax.set_ylabel("Memoria media durante o processamento (MiB)")
ax.set_xticks(list(repeticoes))
ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.15), ncol=3)
ax.grid(axis="y", alpha=0.2)

fig.tight_layout()

destino = base / "Graficos" / "comparacao_memoria_ABC.png"
fig.savefig(destino, dpi=200)
plt.close(fig)

print(f"Grafico guardado em: {destino}")
