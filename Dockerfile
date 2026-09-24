# Stage 1: Builder
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# Stage 2: Runner
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/his.db

COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Crear directorio de datos y ajustar permisos para usuario no-root
RUN mkdir -p /app/data && chown -R node:node /app/data

# Usar el usuario node por seguridad
USER node

# Exponer el puerto configurado
EXPOSE 3000

# Ejecutar las migraciones y levantar el servidor automáticamente
CMD ["sh", "-c", "npm run migrate && npm start"]
