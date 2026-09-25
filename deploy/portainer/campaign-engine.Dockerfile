FROM debian:bookworm-slim AS release

ARG CAMPAIGN_ENGINE_VERSION=0.12.1

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl unzip \
    && mkdir -p /out \
    && curl --fail --location --silent --show-error \
      "https://github.com/gophish/gophish/releases/download/v${CAMPAIGN_ENGINE_VERSION}/gophish-v${CAMPAIGN_ENGINE_VERSION}-linux-64bit.zip" \
      --output /tmp/campaign-engine.zip \
    && unzip -q /tmp/campaign-engine.zip -d /out \
    && rm -f /tmp/campaign-engine.zip \
    && rm -rf /var/lib/apt/lists/*

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=release /out/ /app/

ENTRYPOINT ["/app/gophish"]
