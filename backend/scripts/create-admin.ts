import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || 'Admin User';

  if (!email || !password) {
    console.error('❌ Utilizare: ts-node create-admin.ts <email> <password> [name]');
    process.exit(1);
  }

  try {
    // Verifică dacă user-ul există deja
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('⚠️  User-ul există deja. Actualizez parola...');
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await prisma.user.update({
        where: { email },
        data: {
          passwordHash: hashedPassword,
          role: 'ADMIN'
        }
      });

      console.log('✅ Parolă actualizată cu succes!');
      console.log(`📧 Email: ${email}`);
      console.log(`👤 Nume: ${existingUser.name}`);
      console.log(`🔑 Role: ADMIN`);
    } else {
      console.log('➕ Creez user nou...');
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          name,
          role: 'ADMIN'
        }
      });

      console.log('✅ User admin creat cu succes!');
      console.log(`📧 Email: ${user.email}`);
      console.log(`👤 Nume: ${user.name}`);
      console.log(`🔑 Role: ${user.role}`);
      console.log(`🆔 ID: ${user.id}`);
    }

    // Verifică/creează AdminSettings
    const settings = await prisma.adminSettings.findFirst();
    if (!settings) {
      await prisma.adminSettings.create({
        data: {
          updatedBy: email
        }
      });
      console.log('✅ AdminSettings creat');
    }

  } catch (error) {
    console.error('❌ Eroare:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
