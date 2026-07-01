# Promo-Effect — Ghid de instalare pe un server nou

Acest document explică pas cu pas cum se instalează platforma Promo-Effect
pe un server curat (ex. serverul clientului). Urmează pașii în ordine.

Timp estimat: **30–45 minute**.

---

## 0. Ce primești în pachetul de handoff

Codul stă pe GitHub. Datele NU se pun pe GitHub (ar fi nesigur), deci vin
separat, în pachetul de handoff (`promo-effect-handoff.tar.gz`):

| Fișier          | Ce este                                                 |
| --------------- | ------------------------------------------------------- |
| (GitHub repo)   | Codul aplicației — `git clone`                          |
| `db-FRESH.dump` | Baza de date completă (clienți, rezervări, containere)  |
| `uploads/`      | Fișierele PDF din emailuri (deja curățate de duplicate) |
| `backend.env`   | Cheile și parolele (Gmail, hărți AIS, AI, etc.)         |

---

## 1. Cerințe server

Server Linux (recomandat **Ubuntu 24.04 LTS**) cu:

- **Node.js 20** (`node -v` → v20.x)
- **PostgreSQL 16**
- **Redis** (opțional, pentru cache/rate-limit)
- **nginx** (reverse proxy + SSL)
- **PM2** (`npm i -g pm2`) — ține aplicația pornită
- **git**
- Minim **2 GB RAM**, **10 GB disc liber**

Instalare rapidă a dependințelor pe Ubuntu:

```bash
# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql redis-server nginx git
sudo npm i -g pm2
```

---

## 2. Ia codul de pe GitHub

```bash
sudo mkdir -p /opt/promo-effect && sudo chown $USER /opt/promo-effect
git clone git@github.com:Web-Clients/promo-effect.git /opt/promo-effect
cd /opt/promo-effect
```

---

## 3. Creează baza de date

```bash
sudo -u postgres psql <<'SQL'
CREATE USER promo_effect WITH PASSWORD 'ALEGE_O_PAROLA_NOUA';
CREATE DATABASE promo_effect OWNER promo_effect;
GRANT ALL PRIVILEGES ON DATABASE promo_effect TO promo_effect;
SQL
```

> Notează parola aleasă — o pui în `backend/.env` la pasul 4.

---

## 4. Configurează cheile (.env)

Copiază fișierul `backend.env` din pachet în `backend/.env`:

```bash
cp /calea/catre/handoff/backend.env /opt/promo-effect/backend/.env
```

Apoi **editează** `backend/.env` și schimbă:

- `DATABASE_URL` → pune parola nouă de la pasul 3
- `FRONTEND_URL` și `ALLOWED_ORIGINS` → domeniul clientului
- `AISSTREAM_API_KEY` → gratuit de la https://aisstream.io (sau păstrează cheia existentă)

Restul cheilor (Gmail, AI, Infobip) pot rămâne cum sunt.

---

## 5. Instalează + construiește

```bash
cd /opt/promo-effect
npm ci --legacy-peer-deps        # dependințe frontend
npm run build                    # construiește site-ul (folderul dist/)

cd backend
npm ci                           # dependințe backend
npm run build                    # construiește serverul
npx prisma generate              # pregătește accesul la DB
```

---

## 6. Restaurează baza de date

```bash
cd /opt/promo-effect/backend
# aplică structura tabelelor
npx prisma migrate deploy
# încarcă datele din pachet
PGPASSWORD='parola_noua' pg_restore -h localhost -U promo_effect \
  -d promo_effect --data-only --disable-triggers /calea/catre/handoff/db-FRESH.dump
```

> Dacă `pg_restore` dă erori de tip "already exists", e normal — migrarea a
> creat deja tabelele; folosim `--data-only` ca să punem doar datele.

---

## 7. Restaurează fișierele PDF

```bash
mkdir -p /opt/promo-effect/uploads
rsync -a /calea/catre/handoff/uploads/ /opt/promo-effect/uploads/
```

---

## 8. Pornește aplicația

```bash
cd /opt/promo-effect/backend
pm2 start dist/server.js --name promo-effect-backend --update-env
pm2 save
pm2 startup   # urmează instrucțiunea afișată ca să pornească automat la reboot
```

Verifică:

```bash
curl http://localhost:3001/health      # trebuie {"status":"UP"}
```

---

## 9. nginx + SSL (site public)

Configurație minimă nginx (`/etc/nginx/sites-available/promo-effect`):

```nginx
server {
  server_name DOMENIUL_CLIENTULUI;

  # Frontend (site construit)
  location / {
    root /opt/promo-effect/dist;
    try_files $uri /index.html;
  }

  # Backend API
  location /api/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  # Fișiere (PDF-uri)
  location /storage/ {
    proxy_pass http://localhost:3001;
  }
}
```

Activează + SSL gratuit:

```bash
sudo ln -s /etc/nginx/sites-available/promo-effect /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d DOMENIUL_CLIENTULUI      # SSL Let's Encrypt gratuit
```

---

## 10. Verificare finală

- [ ] `curl http://localhost:3001/health` → `{"status":"UP"}`
- [ ] Site-ul se deschide în browser pe domeniul clientului
- [ ] Login cu contul admin funcționează
- [ ] Pagina "Hartă Flotă" arată nave (AISStream se conectează în ~30s)
- [ ] Pagina "Rezervări" arată datele restaurate

---

## Ce rulează automat (cron / joburi)

Odată pornit, backend-ul rulează singur:

| Job               | Frecvență    | Ce face                                         |
| ----------------- | ------------ | ----------------------------------------------- |
| Email fetcher     | la 15 min    | Citește emailuri Gmail, extrage rezervări cu AI |
| Container sync    | la 10 min    | Actualizează pozițiile navelor din AISStream    |
| Payment reminders | zilnic 10:00 | Notificări facturi restante                     |
| ETA reminder      | zilnic 08:00 | Notificări clienți despre sosire                |
| Daily report      | zilnic 18:00 | Raport operațional pe email                     |

AISStream (harta cu nave live) se conectează automat la pornire — nu trebuie
configurat nimic în plus.

---

## Suport

Codul: https://github.com/Web-Clients/promo-effect
Toate secretele sunt în `backend/.env` (nu se pun niciodată pe GitHub).
