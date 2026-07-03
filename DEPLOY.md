# DEPLOY — heich-gi (PWA tracker GPS) → coleccionador.live (Droplet gradioFish)

Runbook estilo quiniela/DEPLOY.md. Pensado para que lo corra **Claude Code en la
terminal** (llave SSH vía agente + `doctl` autenticado) o el usuario a mano.

## Contexto

- **App**: SvelteKit 2 + Svelte 5, `adapter-node`, sin base de datos (fase 1). Repo: `Moibe/heich-gi` (rama `main`).
- **Droplet**: `gradioFish` — IP `165.22.53.200`, Ubuntu, usuario `root`. pm2 + nginx (configs en el repo hermano `nx-routes`, auto-deploy por Action al push a `main`; el symlink en `sites-enabled` es manual la primera vez).
- **Dominio**: `coleccionador.live`, comprado en **Namecheap**, DNS administrado en **DigitalOcean** (zona ya creada el 2026-07-02: apex + www → 165.22.53.200).
- **Puerto**: `3300` (3000 = quiniela, 3100 y 3200 ocupados — verificar en A0 igualmente).
- **PWA**: HTTPS es requisito duro (geolocalización, wake lock e instalación no funcionan sin él).
- **www → apex forzado**: una PWA vive atada a su origin (permisos, manifest, instalación); www y apex son origins distintos → todo al apex, y `ORIGIN=https://coleccionador.live` siempre cuadra.

## Prerrequisitos (una sola vez)

1. **Nameservers en Namecheap** (usuario): Domain List → coleccionador.live → Nameservers → **Custom DNS**:
   `ns1.digitalocean.com`, `ns2.digitalocean.com`, `ns3.digitalocean.com`.
   Verificar propagación (puede tardar de minutos a horas):
   ```bash
   nslookup coleccionador.live   # debe devolver 165.22.53.200
   ```
2. **Repo en GitHub** (usuario): crear `Moibe/heich-gi`, commit y push de este código a `main`.
3. **Secrets del repo** (usuario — Settings → Secrets → Actions, o `gh secret set`):
   - `SSH_PRIVATE_KEY` — la misma llave que usa quiniela
   - `SSH_HOST` = `165.22.53.200`
   - `SSH_USER` = `root`
4. **Push de `nx-routes`** (usuario): el archivo `nx-routes/coleccionador.live` ya está escrito → commit + push (el Action lo coloca en `sites-available`; NO se activa hasta el symlink de la parte C).
5. Llave SSH cargada en el agente local (tiene passphrase; sin esto el SSH no-interactivo falla con "error in libcrypto"):
   ```bash
   ssh-add
   ssh -o BatchMode=yes root@165.22.53.200 'echo OK conexión'
   ```

---

## PARTE A — App viva en :3300 (SSH)

> ⚠️ **Orden crítico** (patrón de siempre): la app debe responder en `:3300` ANTES de activar nginx, si no → 502.

### A0. Recon
```bash
ssh root@165.22.53.200 'export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use node >/dev/null; node -v; pm2 -v; (ss -tlnp 2>/dev/null||true)|grep -E ":3300\b" || echo ":3300 libre"'
```
- Node debe ser ≥ 20 (vite 8 / SvelteKit 2.63 lo piden). Si el default de nvm es menor: `nvm install 22 && nvm alias default 22` (no tocar el node del sistema).
- Si `:3300` ocupado → elegir otro y reemplazar en TODO el runbook (`.env` + `proxy_pass` en nx-routes).

### A1. Clonar
```bash
ssh root@165.22.53.200 'cd ~/code && git clone git@github.com:Moibe/heich-gi.git heich-gi && cd heich-gi && git log --oneline -1'
```

### A2. Dependencias
```bash
ssh root@165.22.53.200 'export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use node >/dev/null && cd ~/code/heich-gi && npm ci'
```

### A3. `.env` de producción
```bash
ssh root@165.22.53.200 'cat > ~/code/heich-gi/.env <<EOF
ORIGIN=https://coleccionador.live
PORT=3300
HOST=127.0.0.1
EOF
echo ".env creado"'
```
- `HOST=127.0.0.1` → solo accesible vía nginx.

### A4. Build
```bash
ssh root@165.22.53.200 'export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use node >/dev/null && cd ~/code/heich-gi && npm run build'
```
Debe terminar con `Using @sveltejs/adapter-node ✔ done`.

### A5. Arrancar con pm2
```bash
ssh root@165.22.53.200 'export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use node >/dev/null && cd ~/code/heich-gi && set -a && . ./.env && set +a && pm2 start build/index.js --name heich-gi --update-env && pm2 save'
```

### A6. Verificar
```bash
ssh root@165.22.53.200 'curl -s -o /dev/null -w "http=%{http_code}\n" http://127.0.0.1:3300/ ; pm2 ls | grep heich-gi'
```
Debe dar `http=200` y `online`. **Solo entonces, parte B/C.**

---

## PARTE B — nginx vía `nx-routes`

El archivo `nx-routes/coleccionador.live` ya existe (escrito 2026-07-02) con el
patrón de `alphasummitindex.com`: bloque 443 completo con las líneas de Certbot
desde el inicio + www→apex forzado + `proxy_pass http://127.0.0.1:3300`.

- **B1** (usuario): commit + push de `nx-routes` → el Action lo deja en `sites-available`.
- **B2**: NO hay symlink aún, así que nginx no lo carga (y no puede: el cert no existe). Eso es correcto — se activa en la parte C.

---

## PARTE C — Cert + activación (requiere DNS ya propagado)

### C1. Emitir el cert (certonly NO toca configs de nginx):
```bash
ssh root@165.22.53.200 'certbot certonly --nginx -d coleccionador.live -d www.coleccionador.live'
```
(Renovación automática ya corre vía `certbot.timer`.)

### C2. Activar el sitio (symlink manual, primera vez del dominio):
```bash
ssh root@165.22.53.200 'cd /etc/nginx/sites-enabled && ln -s /etc/nginx/sites-available/coleccionador.live coleccionador.live && nginx -t && systemctl reload nginx'
```

---

## Verificación final (la parte PWA)

```bash
curl -s -o /dev/null -w "https      -> %{http_code}\n" https://coleccionador.live/
curl -s -o /dev/null -w "manifest   -> %{http_code}\n" https://coleccionador.live/manifest.webmanifest
curl -s -o /dev/null -w "http→https -> %{http_code}\n" -L http://coleccionador.live/
curl -s -o /dev/null -w "www→apex   -> %{http_code}\n" -L https://www.coleccionador.live/
```
Y en el teléfono:
1. Abrir `https://coleccionador.live` en Safari (iOS) o Chrome (Android).
2. **Add to Home Screen** / Instalar → debe abrir standalone (sin barra de navegador).
3. Iniciar tracking → permiso de ubicación → coordenadas reales con precisión GPS (~5-20 m).
4. iOS: verificar que el permiso se re-pregunta al reabrir (comportamiento esperado, documentado).

## Redespliegue futuro
Push a `main` → el Action `.github/workflows/deploy.yml` hace pull + build + `pm2 restart heich-gi`.

## Rollback rápido
- App: `ssh root@165.22.53.200 'pm2 stop heich-gi'`.
- nginx: quitar symlink + reload, o revertir commit en `nx-routes` y push (usuario).

## Gotchas
- **Orden**: app viva en `:3300` ANTES del symlink; DNS propagado ANTES de certbot.
- **Node < 20 en el droplet**: `nvm install 22`, no tocar el node del sistema.
- **ORIGIN**: debe ser exactamente `https://coleccionador.live` (sin slash final).
- **SSH local**: la llave tiene passphrase → `ssh-add` antes de cualquier sesión de deploy.
- **Certbot**: se usó `certonly` (no edita configs) → el archivo de `nx-routes` es la única fuente de verdad de nginx; pushear `nx-routes` nunca pisa el SSL.
