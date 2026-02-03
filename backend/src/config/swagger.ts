/**
 * Swagger/OpenAPI Configuration
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Promo-Efect Logistics Platform API',
    version: '1.0.0',
    description: `
      API документация для платформы Promo-Efect - системы управления логистикой контейнерных перевозок.
      
      ## Аутентификация
      Большинство endpoints требуют JWT токен. Получите токен через \`POST /api/v1/auth/login\`.
      
      Используйте токен в заголовке:
      \`\`\`
      Authorization: Bearer <your-token>
      \`\`\`
      
      ## Роли
      - **ADMIN** - Полный доступ ко всем функциям
      - **OPERATOR** - Управление контейнерами, клиентами, инвойсами
      - **AGENT** - Доступ к своим данным
      - **CLIENT** - Доступ только к своим данным
      
      ## Версионирование
      Все endpoints находятся под \`/api/v1/\`. Старые endpoints без версии также поддерживаются для обратной совместимости.
      
      ## Формат ответов
      Все успешные ответы имеют формат:
      \`\`\`json
      {
        "success": true,
        "data": {...},
        "meta": {...}, // для paginated responses
        "timestamp": "2025-12-18T10:00:00.000Z"
      }
      \`\`\`
      
      Ошибки имеют формат:
      \`\`\`json
      {
        "success": false,
        "error": "Error message",
        "timestamp": "2025-12-18T10:00:00.000Z"
      }
      \`\`\`
    `,
    contact: {
      name: 'Promo-Efect Support',
      email: 'support@promo-efect.md',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server',
    },
    {
      url: 'https://api.promo-efect.md',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT токен полученный через /api/v1/auth/login',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'string',
            example: 'Error message',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Success: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      PaginatedResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'array',
            items: {
              type: 'object',
            },
          },
          meta: {
            type: 'object',
            properties: {
              page: {
                type: 'number',
                example: 1,
              },
              limit: {
                type: 'number',
                example: 20,
              },
              total: {
                type: 'number',
                example: 100,
              },
              totalPages: {
                type: 'number',
                example: 5,
              },
            },
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com',
          },
          name: {
            type: 'string',
            example: 'John Doe',
          },
          phone: {
            type: 'string',
            example: '+37312345678',
          },
          company: {
            type: 'string',
            example: 'Company Name',
          },
          role: {
            type: 'string',
            enum: ['CLIENT', 'AGENT', 'OPERATOR', 'ADMIN', 'SUPER_ADMIN'],
            example: 'CLIENT',
          },
          emailVerified: {
            type: 'boolean',
            example: true,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Client: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          companyName: {
            type: 'string',
            example: 'Import SRL',
          },
          contactPerson: {
            type: 'string',
            example: 'Ion Popescu',
          },
          email: {
            type: 'string',
            format: 'email',
          },
          phone: {
            type: 'string',
          },
          address: {
            type: 'string',
          },
          taxId: {
            type: 'string',
          },
          status: {
            type: 'string',
            enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
          },
        },
      },
      Container: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          containerNumber: {
            type: 'string',
            example: 'MAEU1234567',
          },
          currentStatus: {
            type: 'string',
            enum: [
              'IN_TRANSIT',
              'LOADED_ON_VESSEL',
              'VESSEL_DEPARTURE',
              'IN_PORT',
              'CUSTOMS_INSPECTION',
              'DELIVERED',
            ],
          },
          eta: {
            type: 'string',
            format: 'date-time',
          },
          actualArrival: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Invoice: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          invoiceNumber: {
            type: 'string',
            example: 'INV-2025-001',
          },
          clientId: {
            type: 'string',
            format: 'uuid',
          },
          amount: {
            type: 'number',
            example: 5000.00,
          },
          currency: {
            type: 'string',
            example: 'EUR',
          },
          status: {
            type: 'string',
            enum: ['DRAFT', 'UNPAID', 'PAID', 'OVERDUE', 'CANCELLED'],
          },
          issueDate: {
            type: 'string',
            format: 'date-time',
          },
          dueDate: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Payment: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          invoiceId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
          },
          amount: {
            type: 'number',
            example: 5000.00,
          },
          currency: {
            type: 'string',
            example: 'EUR',
          },
          method: {
            type: 'string',
            enum: ['TRANSFER_BANCAR', 'CASH', 'CARD', 'ALTA'],
          },
          paidAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Auth',
      description: 'Аутентификация и авторизация',
    },
    {
      name: 'Users',
      description: 'Управление пользователями',
    },
    {
      name: 'Clients',
      description: 'Управление клиентами',
    },
    {
      name: 'Containers',
      description: 'Управление контейнерами',
    },
    {
      name: 'Tracking',
      description: 'Отслеживание контейнеров',
    },
    {
      name: 'Invoices',
      description: 'Управление инвойсами',
    },
    {
      name: 'Payments',
      description: 'Управление платежами',
    },
    {
      name: 'Notifications',
      description: 'Управление уведомлениями',
    },
    {
      name: 'Reports',
      description: 'Отчеты и аналитика',
    },
    {
      name: 'Settings',
      description: 'Настройки системы',
    },
  ],
};

const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: [
    './src/modules/**/*.routes.ts',
    './src/modules/**/*.controller.ts',
    './src/server.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

