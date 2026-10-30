import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Default admin account "radu". Password comes from SEED_ADMIN_PASSWORD (never committed).
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) throw new Error('Set SEED_ADMIN_PASSWORD in .env before seeding');
  const adminHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { username: 'radu' },
    update: {},
    create: {
      email: process.env.SEED_ADMIN_EMAIL ?? 'radu@hostedgames.app',
      username: 'radu',
      passwordHash: adminHash,
      role: 'admin',
    },
  });

  // Built-in chess game entry
  await prisma.game.upsert({
    where: { slug: 'chess' },
    update: {},
    create: {
      name: 'Chess',
      slug: 'chess',
      description: 'Play chess against other registered users or the computer',
    },
  });

  console.log('Seed completed.');
}

main()
  .catch((e: Error) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
