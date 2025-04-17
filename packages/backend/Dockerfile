FROM node:20-alpine AS base


WORKDIR /usr/src/app

COPY package.json ./
COPY package-lock.json ./


# ---- Dependencies Stage ----
FROM base AS dependencies

RUN npm ci --omit=dev

COPY . /usr/src/app/

# ---- Build Stage ----
FROM dependencies AS build

RUN npm ci

COPY . /usr/src/app/

# Build the NestJS application
RUN npm run build

# ---- Production Stage ----
FROM base AS production

# Copy only necessary files from the build stage
COPY --from=build /usr/src/app/node_modules ./node_modules/
COPY --from=build /usr/src/app/dist ./dist/

COPY package.json ./package.json

EXPOSE 3000

CMD ["node", "dist/main"]
