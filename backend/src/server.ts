
import app from './app';
import prisma from './lib/prisma';
// FIX: Import exit from process to avoid type conflicts with DOM Process type.
import { exit } from 'process';
import { startAllJobs } from './jobs';

const PORT = process.env.PORT || 4000;

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
