
import csv
from datetime import datetime, timezone
from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib.dates as mdates

# Pasta dos testes, fora do repositorio
base = Path(__file__).resolve().parents[2] / "Testes_Elasticidade"
ficheiro = base / "Medicoes_Finais" / "C" / "C_R1_rabbitmq.csv"

horas = []
replicas = []
fila = []
em_processamento = []

with open(ficheiro, encoding="utf-8-sig", newline="") as f:
    for linha in csv.DictReader(f):
        horas.append(
            datetime.fromtimestamp(float(linha["timestamp"]), tz=timezone.utc)
        )
        replicas.append(int(linha["replicas"]))
        fila.append(int(linha["ready"]))
        em_processamento.append(int(linha["unacknowledged"]))

fig, ax = plt.subplots(figsize=(11, 5.5))

# Evolucao das replicas
ax.step(
    horas, replicas, where="post",
    label="Réplicas ativas", linewidth=2.5
)

# Mensagens na fila e em processamento
ax.plot(
    horas, fila, marker="o", markersize=3,
    label="Mensagens em espera"
)

ax.plot(
    horas, em_processamento, marker=".",
    markersize=4, label="Mensagens em processamento"
)

ax.set_title("Comportamento do autoscaling - C_R1")
ax.set_xlabel("Hora (UTC)")
ax.set_ylabel("Número de réplicas / mensagens")
ax.set_yticks(range(0, max(max(replicas), max(fila), max(em_processamento)) + 2))
ax.grid(alpha=0.2)

ax.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M:%S", tz=timezone.utc))
fig.autofmt_xdate(rotation=30)

ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.20), ncol=3)

fig.tight_layout()

destino = base / "Graficos" / "autoscaling_C_R1.png"
fig.savefig(destino, dpi=200)
plt.close(fig)

print(f"Gráfico guardado em: {destino}")
