FROM manimcommunity/manim:v0.20.1

USER root
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*
COPY requirements.txt /tmp/requirements.txt
RUN python -m pip install --no-cache-dir -r /tmp/requirements.txt

WORKDIR /renderer
COPY . /renderer
RUN mkdir -p /output /work && chown -R 1000:1000 /output /work /renderer
USER 1000

ENV RENDER_OUTPUT_ROOT=/output
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
