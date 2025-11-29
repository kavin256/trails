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

    // Log request details
    console.log(`\n📥 ${req.method} ${req.path}`);

    // Special handling for /trips/batch sync endpoint
    if (req.path === '/trips/batch' && req.method === 'POST') {
      const { lastSyncedAt, changes } = req.body || {};
      const syncType = lastSyncedAt === null ? 'FULL SYNC' : 'INCREMENTAL';
      console.log(`   Type: ${syncType}`);
      if (lastSyncedAt !== null) {
        console.log(`   Last synced: ${new Date(lastSyncedAt).toLocaleTimeString()}`);
      }
      console.log(`   Client sending: ${changes?.length || 0} trips`);
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
      if (req.path === '/trips/batch' && req.method === 'POST') {
        const { applied, serverChanges } = body || {};
        console.log(`📤 Response (${res.statusCode}) - ${duration}ms`);
        console.log(`   Applied: ${applied?.length || 0} trips`);
        console.log(`   Server changes: ${serverChanges?.length || 0} trips`);

        if (serverChanges?.length > 0) {
          const changeIds = serverChanges.map((t: any) =>
            `${t.id}${t.deleted ? ' (deleted)' : ''}`
          ).join(', ');
          console.log(`   Changed IDs: ${changeIds}`);
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
