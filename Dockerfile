# syntax=docker/dockerfile:1.4

# 1. Build Stage
FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
COPY apps/api/package.json apps/api/package.json
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn install --frozen-lockfile --network-timeout 600000 --network-concurrency 3
COPY apps/api apps/api
RUN yarn workspace api build

# 2. Production dependencies only (no devDependencies)
FROM node:20-alpine AS prod-deps
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
COPY apps/api/package.json apps/api/package.json
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    mkdir -p apps/api/node_modules \
    && yarn install --production --frozen-lockfile --network-timeout 600000 --network-concurrency 3

# 3. Production Stage
FROM node:20-alpine AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --from=prod-deps /usr/src/app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /usr/src/app/apps/api/dist ./apps/api/dist
EXPOSE 3000
CMD ["node", "apps/api/dist/main"]