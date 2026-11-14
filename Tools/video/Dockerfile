FROM python:3.11-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ./utils/requirements.txt ./utils/requirements.txt
RUN pip install --no-cache-dir -r ./utils/requirements.txt
COPY ./utils/env.py ./utils/filters.py ./utils/
COPY ./video/worker.py ./video/video_media.py ./
COPY ./video/video.py ./video/video_processor.py ./video/effects.py ./

CMD [ "python", "-u", "video.py" ]
