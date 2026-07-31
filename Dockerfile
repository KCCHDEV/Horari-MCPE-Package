FROM node:20.9-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV NODE_ENV=production
RUN npm run build
EXPOSE 3002
CMD ["npm", "run", "start"]
