FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium chromium-driver python3-venv ca-certificates fonts-liberation sudo tini \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/holo \
    && /opt/holo/bin/pip install --no-cache-dir 'hai-agents[cli,browser]==1.5.1' \
    && npm install -g pnpm@12.18.0

ENV PATH="/opt/holo/bin:${PATH}" \
    HOLO_BIN=/opt/holo/bin/holo \
    HORAMA_CHROME_LAUNCHER=/usr/local/bin/horama-chrome
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY agent/ agent/
COPY contrats/ contrats/
COPY jugement/ jugement/
COPY memoire/ memoire/
COPY automatisation/scene/scene.mjs automatisation/scene/agent-h.mjs automatisation/scene/
COPY automatisation/scene/couche-horama.js automatisation/scene/
COPY docs/da/trait.js docs/da/
COPY docs/da/mascotte/*.svg docs/da/mascotte/
COPY --chmod=0755 agent/scripts/chrome-container.mjs /usr/local/bin/horama-chrome
RUN pnpm --filter @horama/agent... install --frozen-lockfile --prod \
    && useradd --system --user-group --create-home --shell /usr/sbin/nologin horama-chrome \
    && printf '%s\n' 'node ALL=(horama-chrome) NOPASSWD: /usr/local/bin/horama-chrome' > /etc/sudoers.d/horama-chrome \
    && chmod 0440 /etc/sudoers.d/horama-chrome \
    && visudo -cf /etc/sudoers.d/horama-chrome \
    && install -d -m 0700 -o node -g node /data
USER node
ENTRYPOINT ["/usr/bin/tini", "--", "node", "agent/scripts/container.mjs"]
CMD ["--service"]
