FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
  bash \
  ca-certificates \
  git \
  gh \
  jq \
  make \
  openssh-client \
  python3 \
  ripgrep \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace/my-app

ENV PATH="/workspace/my-app/node_modules/.bin:${PATH}"
