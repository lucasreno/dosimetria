# Use the official Bun image
FROM oven/bun:1 as base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables must be present at build time if they are used in the code
# ARG PUBLIC_API_URL
# ENV PUBLIC_API_URL=${PUBLIC_API_URL}

RUN bun run build

# Production image, copy all the files and run next
FROM oven/bun:1 AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["bun", "run", "build/index.js"]
