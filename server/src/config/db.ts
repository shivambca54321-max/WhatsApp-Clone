import mongoose from 'mongoose';
import dns from 'dns';
import logger from '../utils/logger';

// Fix for Node.js SRV DNS lookup issues on Windows / IPv6 ISP routers
if (process.platform === 'win32') {
  try {
    dns.setDefaultResultOrder('ipv4first');
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (e) {
    // Ignore fallback if custom DNS setting is restricted
  }
}

export const connectDB = async (): Promise<void> => {
  try {
    const connString = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/whatsapp-clone';
    logger.info('Connecting to MongoDB...');
    
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error: %O', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    await mongoose.connect(connString);
  } catch (error) {
    logger.error('Failed to connect to MongoDB: %O', error);
  }
};
