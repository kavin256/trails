import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Simple request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptimeSeconds: process.uptime(),
    serverTime: Date.now(),
  });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});
