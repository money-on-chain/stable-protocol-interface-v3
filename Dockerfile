FROM node:22.23.1

LABEL maintainer="Nicolas Flores & Martin Mulone"

WORKDIR /usr/src/app

# Install dependencies with locked versions before copying source
# so this layer is cached as long as the lockfile doesn't change.
COPY package.json package-lock.json ./
RUN npm ci

# Source and configuration
COPY src/ ./src/
COPY public/ ./public/
COPY vite.config.ts tsconfig.json tsconfig.node.json tsconfig.eslint.json eslint.config.js ./

# Build scripts
COPY build_target.sh prepare_target.sh remove_build.sh ./

# Environment files (one per deployment target)
COPY .env ./
COPY .env.flipmoneyMainnet .env.flipmoneyTestnet ./
COPY .env.rocMainnet .env.rocTestnet ./
COPY .env.votingMainnet .env.votingTestnet ./
COPY .env.lendborrowTestnet ./

# Pass TARGET_BUILD at runtime: docker run -e TARGET_BUILD=build:roc-mainnet <image>
CMD ["/bin/bash", "-c", "bash ./build_target.sh"]
