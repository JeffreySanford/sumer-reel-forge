import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url:
      process.env['DATABASE_URL'] ??
      'postgresql://sumer_reel_forge:sumer_reel_forge@localhost:5432/sumer_reel_forge',
  },
});
