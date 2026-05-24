import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: 'pages/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'PriceHawk API Documentation',
        version: '1.0',
        description: 'Comprehensive API documentation for the PriceHawk project.',
      },
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [],
    },
  });
  return spec;
};
