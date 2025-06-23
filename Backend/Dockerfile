# ---- Backend image ----
FROM node:20-alpine

WORKDIR /app

# install only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# copy source
COPY . .

EXPOSE 3034
ENV NODE_ENV=production

CMD ["node", "server.js"]

