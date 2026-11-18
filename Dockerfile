FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium chromium-driver python3-venv ca-certificates fonts-liberation tini \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/holo \
    && /opt/holo/bin/pip install --no-cache-dir 'hai-agents[cli,browser]==1.5.1' \
    && npm install -g pnpm@12.18.0

ENV PATH="/opt/holo/bin:${PATH}" \
    HOLO_BIN=/opt/holo/bin/holo \
    CHROME_BIN=/usr/bin/chromium
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY agent/ agent/
COPY contrats/ contrats/
COPY jugement/ jugement/
COPY memoire/ memoire/
COPY automatisation/scene/scene.mjs automatisation/scene/agent-h.mjs automatisation/scene/
RUN pnpm --filter @horama/agent... install --frozen-lockfile --prod \
    && mkdir -p /data && chown node:node /data
USER node
ENTRYPOINT ["/usr/bin/tini", "--", "node", "agent/scripts/container.mjs"]
CMD ["--help"]
