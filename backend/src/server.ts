import app from './app';
import prisma from './lib/prisma';
// FIX: Import exit from process to avoid type conflicts with DOM Process type.
import { exit } from 'process';
import { startAllJobs } from './jobs';

const PORT = process.env.PORT || 4000;

// Validate JWT_SECRET before starting
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters');
  exit(1);
}
if (JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
  console.error('FATAL: JWT_SECRET is still the default placeholder. Change it!');
  exit(1);
}

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection established.');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🩺 Health check available at http://localhost:${PORT}/health`);

      // Start background jobs
      if (process.env.ENABLE_BACKGROUND_JOBS !== 'false') {
        startAllJobs();
      } else {
        console.log('⏸️ Background jobs disabled (ENABLE_BACKGROUND_JOBS=false)');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    exit(1);
  }
}

startServer();
