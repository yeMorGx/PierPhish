FROM node:22-alpine

ENV NODE_ENV=production \
    DATA_DIR=/data

WORKDIR /app
COPY --chown=node:node connector/bridge.mjs /app/bridge.mjs
RUN mkdir -p /data && chown node:node /data && chmod 700 /data

USER node
ENTRYPOINT ["node", "/app/bridge.mjs"]
