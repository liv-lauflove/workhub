# 1. Base stage - Install dependencies
FROM node:20-alpine AS base
WORKDIR /app

# Install pnpm and dependencies using frozen lockfile
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@12.3.4 && pnpm install --frozen-lockfile

# 2. Development stage for docker-compose local dev
FROM node:20-alpine AS dev
WORKDIR /app
ENV NODE_ENV=development

COPY --from=base /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["pnpm", "run", "dev"]

# 3. Builder stage for production builds
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY . .

# Set environment variables for build step
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm run build

# 4. Production runner stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
