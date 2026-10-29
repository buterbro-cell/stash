# Runs server.js: serves the page and proxies AI generation (key from OPENROUTER_API_KEY)
FROM node:20-alpine
WORKDIR /app
COPY package.json server.js index.html ./
ENV PORT=8080 NODE_ENV=production
EXPOSE 8080
USER node
CMD ["node", "server.js"]
