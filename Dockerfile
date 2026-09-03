# 1. Build Stage
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

COPY package.json yarn.lock ./
COPY apps/api/package.json apps/api/package.json
RUN yarn install --frozen-lockfile

COPY apps/api apps/api
RUN yarn workspace api build

# 2. Production Stage
FROM node:20-alpine AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY --from=builder /usr/src/app ./

EXPOSE 3000
CMD ["node", "apps/api/dist/main"]
