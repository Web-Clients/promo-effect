# System Architecture

**Версия:** 1.0  
**Дата:** 18 декабря 2025

---

## 🏗️ Общая Архитектура

Promo-Efect построена на **трехслойной архитектуре** (Three-Tier Architecture):

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Frontend   │  │  Landing    │  │   Mobile     │  │
│  │   (React)    │  │   Page      │  │   App (TBD)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    API LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   REST API   │  │   GraphQL    │  │   WebSocket  │  │
│  │   (Express)  │  │   (TBD)      │  │   (TBD)      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │         Authentication & Authorization            │  │
│  │         (JWT, Role-based Access Control)         │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  BUSINESS LOGIC LAYER                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Services   │  │  Integrations│  │ Background  │  │
│  │              │  │              │  │   Jobs      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    DATA LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  PostgreSQL  │  │    Redis    │  │      S3      │  │
│  │   (Supabase)  │  │   (Cache)   │  │  (Storage)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Компоненты Системы

### Frontend Layer

**Технологии:**
- React 19 + TypeScript
- Vite 6 (build tool)
- Tailwind CSS
- React Router DOM 6

**Структура:**
```
frontend/
├── components/          # React компоненты
│   ├── ui/            # UI компоненты (Button, Input, etc.)
│   └── ...            # Feature компоненты
├── services/          # API клиенты
├── lib/               # Утилиты
└── App.tsx            # Главный компонент
```

### API Layer

**Технологии:**
- Node.js + Express 4
- TypeScript
- JWT Authentication
- Rate Limiting

**Структура:**
```
backend/
├── src/
│   ├── modules/       # Feature modules
│   │   ├── auth/
│   │   ├── bookings/
│   │   ├── clients/
│   │   └── ...
│   ├── middleware/    # Express middleware
│   ├── services/      # Business logic services
│   └── integrations/  # External integrations
└── prisma/            # Database schema
```

### Business Logic Layer

**Сервисы:**
- Authentication Service
- Booking Service
- Client Service
- Invoice Service
- Tracking Service
- Email Processing Service
- Notification Service

**Интеграции:**
- Gmail OAuth
- Gemini AI
- Terminal49 (tracking)
- Maersk API (tracking)
- Twilio (SMS/WhatsApp)
- SendGrid (Email)

### Data Layer

**Базы данных:**
- **PostgreSQL** (Supabase) - основная БД
- **Redis** - кэширование и сессии
- **S3** - хранение документов

---

## 🔄 Data Flow

### Типичный запрос:

```
1. User → Frontend (React)
2. Frontend → API (REST)
3. API → Authentication Middleware (JWT проверка)
4. API → Service Layer (Business Logic)
5. Service → Data Layer (Prisma → PostgreSQL)
6. Service → Cache (Redis) - если нужно
7. Response ← Service ← Data Layer
8. Response → Frontend → User
```

### Email Processing Flow:

```
1. Gmail API → Webhook/Email Fetch
2. Email Service → AI Parser (Gemini)
3. AI Parser → Extract Data
4. Email Service → Create Booking (если confidence > 80%)
5. Notification Service → Notify User
```

---

## 🔐 Security Architecture

### Authentication Flow:

```
1. User → POST /api/auth/login
2. Backend → Verify credentials
3. Backend → Generate JWT tokens (access + refresh)
4. Backend → Store refresh token в Redis
5. Frontend → Store tokens в localStorage
6. Frontend → Include access token в headers
7. Backend → Verify token на каждом запросе
```

### Authorization:

- **Role-based Access Control (RBAC)**
- Роли: SUPER_ADMIN, ADMIN, MANAGER, OPERATOR, CLIENT
- Middleware проверяет роль перед доступом к ресурсам

---

## 📊 Scalability Considerations

### Horizontal Scaling:

- Frontend: Stateless, можно масштабировать через CDN
- Backend: Stateless API, можно запускать несколько инстансов
- Database: Read replicas для тяжелых запросов

### Caching Strategy:

- Redis для:
  - Сессий пользователей
  - Кэша API responses
  - Rate limiting
  - Queue management

### Load Balancing:

- Application Load Balancer (ALB) для распределения нагрузки
- Health checks для автоматического failover

---

## 🔗 External Integrations

```
┌─────────────┐
│   Gmail     │──→ OAuth 2.0 ──→ Email Processing
└─────────────┘

┌─────────────┐
│   Gemini    │──→ AI API ──→ Email Parsing
└─────────────┘

┌─────────────┐
│ Terminal49  │──→ Tracking API ──→ Container Tracking
└─────────────┘

┌─────────────┐
│   Maersk    │──→ Shipping API ──→ Container Tracking
└─────────────┘

┌─────────────┐
│   Twilio    │──→ SMS/WhatsApp API ──→ Notifications
└─────────────┘

┌─────────────┐
│  SendGrid   │──→ Email API ──→ Transactional Emails
└─────────────┘
```

---

## 📈 Performance Optimizations

1. **Database:**
   - Индексы на часто используемых полях
   - Connection pooling
   - Query optimization

2. **API:**
   - Response caching в Redis
   - Rate limiting
   - Pagination для больших списков

3. **Frontend:**
   - Code splitting
   - Lazy loading компонентов
   - Image optimization
   - CDN для статических файлов

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────┐
│           CloudFront (CDN)              │
│         (Static Assets)                 │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│      Application Load Balancer (ALB)    │
└─────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌──────────────┐      ┌──────────────┐
│  Frontend    │      │   Backend    │
│  (ECS/Fargate)│      │  (ECS/Fargate)│
└──────────────┘      └──────────────┘
                              │
                              ▼
┌─────────────────────────────────────────┐
│         RDS PostgreSQL (Multi-AZ)       │
│         ElastiCache Redis               │
│         S3 (Documents)                  │
└─────────────────────────────────────────┘
```

---

**Последнее обновление:** 18 декабря 2025

