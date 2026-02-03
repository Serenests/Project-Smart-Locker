// Smart-locker-API/lib/prisma.js
// ✅ Prisma Client Singleton Pattern

const { PrismaClient } = require('@prisma/client');

// ✅ ป้องกันการสร้าง instance ใหม่ใน development hot reload
const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ['warn', 'error'], // ลด log ใน production
  // ✅ Connection Pool Configuration
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// ✅ Graceful Shutdown
process.on('beforeExit', async () => {
  console.log('🔌 Disconnecting Prisma Client...');
  await prisma.$disconnect();
});

module.exports = prisma;