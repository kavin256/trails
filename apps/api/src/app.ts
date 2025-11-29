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
    const requestLabel = `${req.method} ${req.path}`;
    const details: string[] = [];

    // Log request details
    console.log(`\n▶️ Start ${requestLabel}\n`);

    // Special handling for /trips/batch sync endpoint
    if (req.path === '/trips/batch' && req.method === 'POST') {
      const { lastSyncedAt, changes } = req.body || {};
      const syncType = lastSyncedAt === null ? 'FULL SYNC' : 'INCREMENTAL';
      details.push(`Type: ${syncType}`);
      if (lastSyncedAt !== null) {
        details.push(`Last synced: ${new Date(lastSyncedAt).toLocaleTimeString()}`);
      }
      details.push(`Client sending: ${changes?.length || 0} trips`);
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
        details.push(`Applied: ${applied?.length || 0} trips`);
        details.push(`Server sending: ${serverChanges?.length || 0} trips`);

        if (serverChanges?.length > 0) {
          const changeIds = serverChanges.map((t: any) =>
            `${t.id}${t.deleted ? ' (deleted)' : ''}`
          ).join(', ');
          details.push(`Changed IDs: ${changeIds}`);
        }

        console.log(`Details;`);
        details.forEach(line => console.log(line));
        console.log(`\n✅ Finish ${requestLabel} (${res.statusCode}) - ${duration}ms\n`);
      } else {
        console.log(`✅ Finish ${requestLabel} (${res.statusCode}) - ${duration}ms`);
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
