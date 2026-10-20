import json
import os
import tempfile

from faster_whisper import WhisperModel
from flask import Flask, Response, jsonify, request, stream_with_context

app = Flask(__name__)

# Único idioma suportado
LANGUAGE = "en"

# Confiança mínima para considerar que a fala está noutro idioma
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

    # Só é suportado o inglês (RN4 das legendas)
    language = request.form.get("language", LANGUAGE)
    if language != LANGUAGE:
        return jsonify({"error": "only English is supported"}), 400

    # Guardar o áudio num ficheiro temporário
    fd, path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    audio.save(path)

    def gen():
        try:
            # Identificar o idioma da fala antes de transcrever
            try:
                segments, info = model.transcribe(path, language=None, vad_filter=True)
                lang, prob = info.language, info.language_probability
            except ValueError:
                # Sem fala detetável o modelo não consegue escolher o idioma
                segments, lang, prob = None, None, 0.0

            yield json.dumps({"type": "info", "language": lang, "probability": prob}) + "\n"

            # Fala noutro idioma com confiança suficiente: não traduzir
            if lang != LANGUAGE and prob >= MIN_PROBABILITY:
                yield json.dumps({"type": "error", "code": "not_english"}) + "\n"
                return

            # Idioma incerto: transcrever em inglês
            if lang != LANGUAGE:
                segments, _ = model.transcribe(path, language=LANGUAGE, vad_filter=True)

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
