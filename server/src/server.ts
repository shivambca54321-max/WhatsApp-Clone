import dotenv from 'dotenv';
// Load environment variables before any other imports
dotenv.config();

import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/error.middleware';
import { apiLimiter } from './middleware/rateLimiter.middleware';
import logger from './utils/logger';
import { initializeSocket } from './socket/socketHandler';
import authRouter from './routes/auth.routes';
import userRouter from './routes/user.routes';
import chatRouter from './routes/chat.routes';
import messageRouter from './routes/message.routes';

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Connect Database
connectDB();

// Global Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow loading local files in dev if needed
}));

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

// Rate limiting
app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/chats', chatRouter);
app.use('/api/messages', messageRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'WhatsApp Server is running smoothly',
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

// Socket.io setup
const io = new SocketServer(server, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
});

app.set('socketio', io);

initializeSocket(io);

// Express Error Handler
app.use(errorHandler);

// Listen
server.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
