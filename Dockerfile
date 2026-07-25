FROM oven/bun:1.3.14

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
ENV NODE_ENV=production
EXPOSE 3002
CMD ["bun", "run", "server.ts"]
