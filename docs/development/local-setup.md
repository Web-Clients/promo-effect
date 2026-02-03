# Local Setup Guide

**Версия:** 1.0  
**Дата:** 18 декабря 2025

---

## 📋 Prerequisites

Перед началом убедитесь, что у вас установлено:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** 9+ (устанавливается с Node.js)
- **Docker** и **Docker Compose** ([Download](https://www.docker.com/get-started))
- **Git** ([Download](https://git-scm.com/))

### Проверка установки:

```bash
node --version  # Должно быть v18.x.x или выше
npm --version   # Должно быть 9.x.x или выше
docker --version
docker-compose --version
git --version
```

---

## 🚀 Quick Start (Docker)

Самый быстрый способ запустить проект локально:

### 1. Клонировать репозиторий

```bash
git clone <repository-url>
cd promo-effect
```

### 2. Настроить Environment Variables

```bash
# Backend
cp backend/.env.example backend/.env
# Отредактируйте backend/.env и заполните необходимые значения

# Frontend
cp .env.example .env
# Отредактируйте .env и заполните VITE_API_URL
```

### 3. Запустить с Docker Compose

```bash
docker-compose up -d
```

Это запустит:
- PostgreSQL (порт 5432)
- Redis (порт 6379)
- Backend API (порт 3001)
- Frontend (порт 3000)

### 4. Применить миграции базы данных

```bash
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx prisma generate
```

### 5. Проверить работу

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health
- Prisma Studio: `docker-compose exec backend npx prisma studio`

---

## 🛠️ Manual Setup (без Docker)

Если вы предпочитаете запускать без Docker:

### 1. Установить PostgreSQL и Redis

**macOS (Homebrew):**
```bash
brew install postgresql@15 redis
brew services start postgresql@15
brew services start redis
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql-15 redis-server
sudo systemctl start postgresql
sudo systemctl start redis
```

**Windows:**
- Скачайте и установите [PostgreSQL](https://www.postgresql.org/download/windows/)
- Скачайте и установите [Redis](https://redis.io/download)

### 2. Создать базу данных

```bash
# Подключиться к PostgreSQL
psql -U postgres

# Создать базу данных и пользователя
CREATE DATABASE promo_effect;
CREATE USER promo_effect WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE promo_effect TO promo_effect;
\q
```

### 3. Настроить Backend

```bash
cd backend

# Установить зависимости
npm install

# Настроить .env
cp .env.example .env
# Отредактируйте .env:
# DATABASE_URL=postgresql://promo_effect:your_password@localhost:5432/promo_effect
# REDIS_URL=redis://localhost:6379

# Применить миграции
npx prisma migrate dev
npx prisma generate

# Запустить в режиме разработки
npm run dev
```

Backend будет доступен на http://localhost:3001

### 4. Настроить Frontend

```bash
# В корне проекта
npm install

# Настроить .env
cp .env.example .env
# Отредактируйте .env:
# VITE_API_URL=http://localhost:3001/api

# Запустить в режиме разработки
npm run dev
```

Frontend будет доступен на http://localhost:3000

---

## 🔧 Development Tools

### Prisma Studio

Визуальный редактор базы данных:

```bash
cd backend
npx prisma studio
```

Откроется на http://localhost:5555

### Database Migrations

```bash
# Создать новую миграцию
npx prisma migrate dev --name migration_name

# Применить миграции
npx prisma migrate deploy

# Сбросить базу данных (development only!)
npx prisma migrate reset
```

### TypeScript Compilation

```bash
# Backend
cd backend
npm run build

# Frontend
npm run build
```

---

## 🐛 Troubleshooting

### Проблема: "Cannot connect to database"

**Решение:**
1. Проверьте, что PostgreSQL запущен: `pg_isready`
2. Проверьте DATABASE_URL в `.env`
3. Проверьте права доступа пользователя к базе данных

### Проблема: "Port already in use"

**Решение:**
1. Найдите процесс, использующий порт:
   ```bash
   # macOS/Linux
   lsof -i :3001
   # Windows
   netstat -ano | findstr :3001
   ```
2. Остановите процесс или измените PORT в `.env`

### Проблема: "Prisma Client not generated"

**Решение:**
```bash
cd backend
npx prisma generate
```

### Проблема: "Module not found"

**Решение:**
```bash
# Удалить node_modules и переустановить
rm -rf node_modules package-lock.json
npm install
```

### Проблема: "Docker containers not starting"

**Решение:**
```bash
# Проверить логи
docker-compose logs

# Пересоздать контейнеры
docker-compose down
docker-compose up -d --build
```

---

## 📝 Environment Variables

### Backend (.env)

Обязательные переменные:
- `DATABASE_URL` - строка подключения к PostgreSQL
- `JWT_SECRET` - секретный ключ для JWT
- `PORT` - порт для backend (по умолчанию 3001)

Опциональные:
- `GEMINI_API_KEY` - для AI email parsing
- `GMAIL_CLIENT_ID` и `GMAIL_CLIENT_SECRET` - для Gmail интеграции
- `REDIS_URL` - для кэширования

См. [Environment Variables Guide](../deployment/environment-variables.md) для полного списка.

### Frontend (.env)

Обязательные переменные:
- `VITE_API_URL` - URL backend API

Все переменные должны начинаться с `VITE_` для работы с Vite.

---

## ✅ Verification

После настройки проверьте:

1. **Backend Health Check:**
   ```bash
   curl http://localhost:3001/health
   # Должен вернуть: {"status":"UP","timestamp":"..."}
   ```

2. **Database Connection:**
   ```bash
   cd backend
   npx prisma studio
   # Должен открыться Prisma Studio
   ```

3. **Frontend:**
   - Откройте http://localhost:3000
   - Должна загрузиться landing page

4. **API:**
   ```bash
   curl http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
   ```

---

## 🎯 Next Steps

После успешной настройки:

1. Прочитайте [Development Workflow](./development-workflow.md)
2. Изучите [Coding Standards](./coding-standards.md)
3. Ознакомьтесь с [API Architecture](../architecture/api-architecture.md)

---

**Последнее обновление:** 18 декабря 2025

