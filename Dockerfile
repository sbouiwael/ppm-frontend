# ===========================================================
#  PPM Frontend — Angular 21 / Nginx
# ===========================================================
#  Build : docker build -t ppm-frontend .
#  Run   : docker run -p 80:80 -e BACKEND_URL=http://my-backend:8082 ppm-frontend
#
#  ARCHITECTURE — multi-stage build :
#    Stage 1 (build)  : node:22-alpine — installe les deps et compile Angular en production
#    Stage 2 (runtime): nginx:alpine   — sert les fichiers statiques et proxifie vers le backend
#    COPY --from=build copie uniquement dist/ (HTML, CSS, JS bundle) — pas de node_modules.
#
#  INJECTION RUNTIME DE LA CONFIGURATION :
#    BACKEND_URL n'est PAS encode dans le bundle Angular a la compilation.
#    A chaque demarrage du conteneur, entrypoint.sh appelle :
#      envsubst '$BACKEND_URL' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
#    Cela remplace $BACKEND_URL dans le template Nginx par la valeur de l'env var.
#    Avantage : la meme image peut pointer vers test/staging/prod backend sans rebuild.
#
#  EN KUBERNETES :
#    BACKEND_URL = http://ppm-backend.ppm-test.svc.cluster.local:8082 (in-cluster DNS)
#    Defini dans le ConfigMap Helm — lire : ppm-gitops/charts/ppm-frontend/templates/configmap.yaml
#
#  FICHIER SUIVANT A LIRE : ppm-gitops/charts/ppm-frontend/templates/deployment.yaml
# ===========================================================

# ---- Stage 1: Build with Node ----
FROM node:22-alpine AS build

WORKDIR /app

# Cache dependencies (re-downloaded only when package files change)
COPY package.json package-lock.json ./
# `npm install` instead of `npm ci` for the same cross-platform reason as in
# .github/workflows/frontend-ci.yml: optional native deps (@emnapi/*) are
# recorded in the lockfile only for the host OS that ran `npm install`.
# Windows-generated lockfile + Linux Docker build = "Missing X from lock file"
# under strict `npm ci`. `npm install` still respects the lockfile but
# tolerates platform-specific gaps.
RUN npm install --no-audit --no-fund --prefer-offline

# Copy source and build for production
COPY . .
RUN npx ng build --configuration production

# ---- Stage 2: Serve with Nginx ----
FROM nginx:alpine

# Apply latest Alpine security patches at build time. Without this, CVEs
# in nghttp2, xz, libxpm etc. detected by Trivy persist in the image even
# though Alpine has published fixes. This pulls patched packages from the
# Alpine repos at build time. --no-cache avoids leaving apk metadata behind.
RUN apk upgrade --no-cache

# Remove default nginx site
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx template (BACKEND_URL substituted at startup by entrypoint.sh)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy entrypoint script that runs envsubst then starts nginx
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copy built Angular app from build stage
COPY --from=build /app/dist/ppm_front/browser /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/index.html || exit 1

CMD ["/entrypoint.sh"]