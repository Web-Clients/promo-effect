# Почему Два Dockerfile?

**Дата:** 18 декабря 2025

---

## 🎯 Основная Причина

У нас **два отдельных приложения** в одном проекте (monorepo):

1. **Backend** - Node.js/Express API сервер
2. **Frontend** - React SPA приложение

Они имеют **разные зависимости, разные процессы сборки и разные runtime окружения**.

---

## 📦 Backend Dockerfile (`backend/Dockerfile`)

### Что это:
- **Node.js приложение** (Express API)
- Запускается как **Node.js процесс**
- Слушает порт **3001**

### Процесс сборки:
```
1. Stage 1 (Builder):
   - Устанавливает Node.js зависимости
   - Генерирует Prisma Client
   - Компилирует TypeScript → JavaScript

2. Stage 2 (Production):
   - Копирует только production зависимости
   - Копирует скомпилированный код
   - Запускает: node dist/server.js
```

### Итоговый образ:
- **Базовый образ:** `node:18-alpine`
- **Размер:** ~150-200 MB
- **Порт:** 3001
- **Команда запуска:** `node dist/server.js`

---

## 🌐 Frontend Dockerfile (`Dockerfile` в корне)

### Что это:
- **React SPA приложение**
- После сборки - это **статические файлы** (HTML, CSS, JS)
- Нужен **веб-сервер** для раздачи файлов

### Процесс сборки:
```
1. Stage 1 (Builder):
   - Устанавливает Node.js зависимости
   - Собирает React приложение (npm run build)
   - Результат: папка dist/ со статическими файлами

2. Stage 2 (Production):
   - Использует Nginx (легковесный веб-сервер)
   - Копирует статические файлы из dist/
   - Nginx раздает файлы на порту 80
```

### Итоговый образ:
- **Базовый образ:** `nginx:alpine`
- **Размер:** ~30-50 MB (намного меньше!)
- **Порт:** 80
- **Команда запуска:** `nginx` (веб-сервер)

---

## 🔄 Почему Не Один Dockerfile?

### ❌ Плохой вариант (один Dockerfile):

```dockerfile
# ПЛОХО - не делайте так!
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build  # frontend
RUN npm run build  # backend
CMD ["node", "dist/server.js"]  # А как frontend?
```

**Проблемы:**
1. ❌ Огромный образ (включает все зависимости frontend и backend)
2. ❌ Нужны оба процесса (Node.js для API + веб-сервер для frontend)
3. ❌ Нельзя масштабировать независимо
4. ❌ Сложнее деплой (всегда деплоится вместе)

### ✅ Хороший вариант (два Dockerfile):

**Преимущества:**
1. ✅ **Независимое масштабирование**
   - Можно запустить 3 backend инстанса и 1 frontend
   - Можно обновить frontend без перезапуска backend

2. ✅ **Оптимизированные образы**
   - Backend: только Node.js + зависимости
   - Frontend: только Nginx + статические файлы (очень легкий!)

3. ✅ **Разные технологии**
   - Backend: Node.js runtime
   - Frontend: Nginx (специализированный веб-сервер)

4. ✅ **Независимый деплой**
   - Frontend можно деплоить на CDN (CloudFront, Vercel)
   - Backend можно деплоить на ECS/Fargate

5. ✅ **Безопасность**
   - Frontend не имеет доступа к backend коду
   - Разделение ответственности

---

## 📊 Сравнение Размеров Образов

### Один Dockerfile (плохо):
```
node:18-alpine + все зависимости frontend + все зависимости backend
≈ 500-800 MB
```

### Два Dockerfile (хорошо):
```
Backend: node:18-alpine + backend зависимости ≈ 150-200 MB
Frontend: nginx:alpine + статические файлы ≈ 30-50 MB
Итого: ~180-250 MB (в 2-3 раза меньше!)
```

---

## 🏗️ Как Это Работает в Docker Compose

```yaml
services:
  backend:
    build:
      context: ./backend        # ← Использует backend/Dockerfile
      dockerfile: Dockerfile
    # Запускает Node.js процесс

  frontend:
    build:
      context: .                # ← Использует корневой Dockerfile
      dockerfile: Dockerfile
    # Запускает Nginx веб-сервер
```

**Результат:**
- Backend контейнер: Node.js API на порту 3001
- Frontend контейнер: Nginx на порту 80 (3000 в хосте)
- Они работают **независимо**, но **вместе** в одной сети

---

## 🚀 Production Deployment

### Вариант 1: Вместе (Docker Compose)
```yaml
# Оба контейнера на одном сервере
backend:  → ECS Fargate
frontend: → ECS Fargate
```

### Вариант 2: Раздельно (Рекомендуется)
```
backend:  → ECS Fargate (AWS)
frontend: → CloudFront + S3 (CDN) - намного быстрее!
```

**Почему раздельно лучше:**
- Frontend на CDN = **быстрая загрузка** для пользователей по всему миру
- Backend на сервере = **безопасность** (недоступен напрямую)

---

## 📝 Итог

**Два Dockerfile = Два отдельных приложения:**

| | Backend | Frontend |
|---|---|---|
| **Технология** | Node.js | React (статический) |
| **Runtime** | Node.js процесс | Nginx веб-сервер |
| **Порт** | 3001 | 80 |
| **Размер образа** | ~150-200 MB | ~30-50 MB |
| **Dockerfile** | `backend/Dockerfile` | `Dockerfile` (корень) |

Это **стандартная практика** для монорепо с frontend и backend!

---

**Последнее обновление:** 18 декабря 2025

