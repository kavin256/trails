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
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📥 ${req.method} ${req.path}`);
    console.log(`   Time: ${new Date().toISOString()}`);

    // Log query parameters
    if (Object.keys(req.query).length > 0) {
      console.log(`   Query:`, req.query);
    }

    // Log request body (for POST/PUT/PATCH)
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      console.log(`   Body:`, JSON.stringify(req.body, null, 2));
    }

    // Capture response
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      const duration = Date.now() - startTime;
      console.log(`📤 Response (${res.statusCode}) - ${duration}ms`);
      console.log(`   Body:`, JSON.stringify(body, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
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
