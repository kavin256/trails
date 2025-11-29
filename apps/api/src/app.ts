import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { tripsRouter } from './routes/trips.js';

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Enhanced request logging middleware (only in development)
if (process.env.NODE_ENV !== 'test') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const logObject = (prefix: string, obj: any) => {
      const serialized = JSON.stringify(obj, null, 2);
      serialized.split('\n').forEach(line => console.log(`${prefix}${line}`));
    };

    const isTripsBatchPost =
      req.method === 'POST' &&
      (req.path === '/trips/batch' ||
        req.originalUrl?.startsWith('/trips/batch'));

    // Log request details
    console.log(`\n📥 ${req.method} ${req.path}`);

    // Special handling for /trips/batch sync endpoint
    if (isTripsBatchPost) {
      const { lastSyncedAt, changes } = req.body || {};
      const syncType = lastSyncedAt === null ? 'FULL SYNC' : 'INCREMENTAL';
      console.log(`   Type: ${syncType}`);
      if (lastSyncedAt !== null) {
        console.log(`   Last synced: ${new Date(lastSyncedAt).toLocaleTimeString()}`);
      }
      console.log(`   Client sending: ${changes?.length || 0} trips`);
      if (Array.isArray(changes) && changes.length > 0) {
        console.log(`   Client changes (${changes?.length}):`);
        changes.forEach((change: any, index: number) => {
          console.log(`     #${index + 1}:`);
          logObject('       ', change);
        });
      }
    } else if (Object.keys(req.query).length > 0) {
      console.log(`   Query:`, req.query);
    } else if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      console.log(`   Body:`, req.body);
    }

    // Capture response
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      const duration = Date.now() - startTime;

      // Special handling for /trips/batch response
      if (isTripsBatchPost) {
        const { applied, serverChanges } = body || {};
        console.log(`📤 Response (${res.statusCode}) - ${duration}ms`);
        console.log(`   Applied: ${applied?.length || 0} trips`);
        console.log(`   Server sending: ${serverChanges?.length || 0} trips`);

        if (Array.isArray(serverChanges) && serverChanges.length > 0) {
          console.log(`   Server changes (${serverChanges?.length}):`);
          serverChanges.forEach((t: any, index: number) => {
            console.log(`     #${index + 1}:`);
            logObject('       ', t);
          });
        }
      } else {
        console.log(`📤 Response (${res.statusCode}) - ${duration}ms`);
        console.log(`   Body:`, body);
      }

      return originalJson(body);
    };

    next();
  });
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptimeSeconds: process.uptime(),
    serverTime: Date.now(),
  });
});

// Trip sync endpoints
app.use('/trips', tripsRouter);

export default app;
