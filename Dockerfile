# ======================================================================================
# ETAPA 1: BUILDER
# ======================================================================================
FROM node:18 AS builder

WORKDIR /usr/src/app
RUN npm install -g pnpm
COPY package*.json ./
RUN pnpm install
COPY . .
RUN pnpm run build


# ======================================================================================
# ETAPA 2: PRODUCTION
# ======================================================================================
FROM node:18-alpine

WORKDIR /usr/src/app
RUN npm install -g pnpm
COPY package*.json ./
RUN pnpm install --prod

# Copia los archivos compilados desde el builder
COPY --from=builder /usr/src/app/dist ./dist

# ----> ESTA ES LA LÍNEA CLAVE CORREGIDA <----
# Copia las credenciales explícitamente desde la carpeta 'src' del builder
COPY --from=builder /usr/src/app/src/credentials ./dist/credentials

RUN mkdir uploads
EXPOSE 8100
CMD [ "node", "dist/index.js" ]