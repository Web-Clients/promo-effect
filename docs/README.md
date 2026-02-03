# 📚 Promo-Efect Platform - Documentation

**Версия:** 2.0  
**Дата:** 18 декабря 2025  
**Статус:** В разработке

---

## 🎯 Обзор Платформы

**Promo-Efect** — это B2B-платформа для управления логистикой контейнерных перевозок, предназначенная для:

- Отслеживания контейнеров
- Управления клиентами и партнёрами
- Хранения документов
- Работы с инвойсами и платежами
- Прозрачного контроля статусов доставки

Система используется внутри компании и её партнёрами, не является публичным сервисом.

---

## 📁 Структура Документации

### Для Разработчиков

- **[Architecture Documentation](./architecture/)** - Архитектура системы
  - [System Architecture](./architecture/system-architecture.md) - Общая архитектура, диаграммы
  - [Database Schema](./architecture/database-schema.md) - Схема базы данных, ERD
  - [API Architecture](./architecture/api-architecture.md) - Архитектура API

- **[Development Guides](./development/)** - Руководства по разработке
  - [Local Setup](./development/local-setup.md) - Настройка локального окружения
  - [Development Workflow](./development/development-workflow.md) - Процесс разработки
  - [Coding Standards](./development/coding-standards.md) - Стандарты кодирования

- **[Backend Documentation](./backend/)** - Документация backend
  - [Services](./backend/services.md) - Описание сервисов
  - [Integrations](./backend/integrations.md) - Внешние интеграции
  - [Background Jobs](./backend/background-jobs.md) - Асинхронные задачи
  - [Email Processing](./backend/email-processing.md) - Обработка email с AI

- **[Frontend Documentation](./frontend/)** - Документация frontend
  - [Component Library](./frontend/component-library.md) - Библиотека компонентов
  - [State Management](./frontend/state-management.md) - Управление состоянием
  - [Routing](./frontend/routing.md) - Маршрутизация
  - [Forms and Validation](./frontend/forms-and-validation.md) - Формы и валидация

- **[Testing](./testing/)** - Тестирование
  - [Testing Strategy](./testing/testing-strategy.md) - Стратегия тестирования
  - [Test Writing Guide](./testing/test-writing-guide.md) - Руководство по написанию тестов

- **[Deployment](./deployment/)** - Развертывание
  - [Infrastructure](./deployment/infrastructure.md) - Инфраструктура
  - [CI/CD](./deployment/ci-cd.md) - CI/CD pipeline
  - [Environment Variables](./deployment/environment-variables.md) - Переменные окружения

- **[Operations](./operations/)** - Операции
  - [Monitoring](./operations/monitoring.md) - Мониторинг
  - [Logging](./operations/logging.md) - Логирование
  - [Backups](./operations/backups.md) - Резервное копирование
  - [Scaling](./operations/scaling.md) - Масштабирование

### Для Интеграций

- **[API Reference](./api/)** - Справочник API
  - [REST API](./api/rest-api.md) - REST API endpoints
  - [Authentication](./api/authentication.md) - Аутентификация
  - [Webhooks](./api/webhooks.md) - Webhooks

---

## 🚀 Quick Start

### Для новых разработчиков

1. Прочитайте [Local Setup Guide](./development/local-setup.md)
2. Изучите [System Architecture](./architecture/system-architecture.md)
3. Ознакомьтесь с [Coding Standards](./development/coding-standards.md)
4. Начните с [Development Workflow](./development/development-workflow.md)

### Для интеграций

1. Изучите [API Reference](./api/rest-api.md)
2. Прочитайте [Authentication Guide](./api/authentication.md)
3. Ознакомьтесь с примерами в документации API

---

## 🛠️ Tech Stack

### Frontend
- React 19 + TypeScript
- Vite 6
- Tailwind CSS
- React Router DOM 6

### Backend
- Node.js + Express 4
- TypeScript
- Prisma ORM
- PostgreSQL (Supabase)

### Infrastructure
- Docker
- AWS (планируется)
- GitHub Actions (CI/CD)

### Services
- Google Gemini AI (email parsing)
- Gmail OAuth 2.0
- Redis (планируется)
- S3 (планируется)

---

## 📊 Статус Проекта

**Общая готовность:** ~45%

- ✅ Backend Architecture: ~45%
- ✅ Landing Page: ~70%
- ⚠️ Documentation: ~25%
- ❌ Deployment: ~5%
- ❌ Training & Support: ~10%

Подробнее см. [TZ Analysis Reports](../TZ_PART1_ANALYSIS.md)

---

## 🤝 Как Внести Вклад

1. Прочитайте [Development Workflow](./development/development-workflow.md)
2. Следуйте [Coding Standards](./development/coding-standards.md)
3. Создайте feature branch
4. Напишите тесты
5. Создайте Pull Request

---

## 📞 Контакты

- **Team Lead:** [TBD]
- **Project Manager:** [TBD]
- **Support:** support@promo-efect.md

---

**Последнее обновление:** 18 декабря 2025

