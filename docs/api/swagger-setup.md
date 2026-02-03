# Swagger/OpenAPI Documentation Setup

## Обзор

API документация доступна через Swagger UI по адресу:
- **Development**: `http://localhost:3001/api-docs`
- **Production**: `https://api.promo-efect.md/api-docs`

## Использование

### Просмотр документации

1. Запустите backend сервер
2. Откройте браузер и перейдите на `/api-docs`
3. Используйте интерфейс Swagger UI для просмотра всех endpoints

### Тестирование API через Swagger

1. Сначала получите JWT токен через `POST /api/v1/auth/login`
2. Нажмите кнопку "Authorize" в правом верхнем углу
3. Введите токен в формате: `Bearer <your-token>`
4. Теперь вы можете тестировать все защищенные endpoints

## Структура документации

### Компоненты

- **Schemas**: Определения моделей данных (User, Client, Container, Invoice, Payment, etc.)
- **Security Schemes**: JWT Bearer authentication
- **Tags**: Группировка endpoints по модулям

### Формат ответов

Все endpoints следуют стандартному формату:

**Успешный ответ:**
```json
{
  "success": true,
  "data": {...},
  "meta": {...}, // для paginated responses
  "timestamp": "2025-12-18T10:00:00.000Z"
}
```

**Ошибка:**
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2025-12-18T10:00:00.000Z"
}
```

## Добавление документации к новым endpoints

Для добавления Swagger документации к новому endpoint, используйте JSDoc комментарии:

```typescript
/**
 * @swagger
 * /api/v1/resource:
 *   get:
 *     summary: Краткое описание
 *     description: Подробное описание
 *     tags: [ResourceTag]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Успешный ответ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
```

## Конфигурация

Файл конфигурации: `backend/src/config/swagger.ts`

Основные настройки:
- OpenAPI версия: 3.0.0
- Информация о API
- Серверы (development, production)
- Компоненты (schemas, security)
- Теги для группировки

## Обновление документации

Документация генерируется автоматически из JSDoc комментариев в файлах routes.

После добавления новых endpoints:
1. Добавьте JSDoc комментарии с `@swagger`
2. Перезапустите сервер
3. Документация обновится автоматически

## Экспорт OpenAPI спецификации

JSON спецификация доступна по адресу:
- `/api-docs.json`

Можно использовать для:
- Импорта в Postman
- Генерации клиентских SDK
- Интеграции с другими инструментами

