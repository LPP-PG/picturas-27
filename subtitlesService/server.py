import json
import os
import tempfile

from faster_whisper import WhisperModel
from flask import Flask, Response, jsonify, request, stream_with_context

app = Flask(__name__)

# Confiança mínima da deteção automática do idioma
MIN_PROBABILITY = 0.5

# Modelo carregado uma só vez no arranque
# Limitar os fios de CPU para não esgotar a máquina
model = WhisperModel(
    os.environ.get("WHISPER_MODEL", "small"),
    device="cpu",
    compute_type="int8",
    cpu_threads=int(os.environ.get("WHISPER_CPU_THREADS", "2")),
)


@app.get("/health")
def health():
    return jsonify({"ok": True})


@app.post("/transcribe")
def transcribe():
    audio = request.files.get("audio")
    if audio is None:
        return jsonify({"error": "audio is required"}), 400

    language = request.form.get("language", "auto")

    # Guardar o áudio num ficheiro temporário
    fd, path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    audio.save(path)

    def gen():
        try:
            try:
                segments, info = model.transcribe(
                    path,
                    language=None if language == "auto" else language,
                    vad_filter=True,
                )
                lang, prob = info.language, info.language_probability
            except ValueError:
                # Sem fala detetável o modelo não consegue escolher o idioma
                if language != "auto":
                    raise
                segments, lang, prob = [], None, 0.0

            yield json.dumps({"type": "info", "language": lang, "probability": prob}) + "\n"

            # Idioma automático com pouca confiança: terminar com erro
            if language == "auto" and prob < MIN_PROBABILITY:
                yield json.dumps({"type": "error", "code": "language_undetermined"}) + "\n"
                return

            for seg in segments:
                yield json.dumps({
                    "type": "segment",
                    "start": round(seg.start, 3),
                    "end": round(seg.end, 3),
                    "text": seg.text.strip(),
                }) + "\n"

            yield json.dumps({"type": "done"}) + "\n"
        finally:
            # Apagar o ficheiro temporário
            if os.path.exists(path):
                os.remove(path)

    return Response(stream_with_context(gen()), mimetype="application/x-ndjson")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7870, threaded=True)
