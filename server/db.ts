import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';
import ws from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

export const db = drizzle({ 
  connection: process.env.DATABASE_URL,
  schema,
  ws: ws
});
