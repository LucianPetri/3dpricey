/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // Create a default company
  const company = await prisma.company.create({
    data: {
      name: 'Default Company',
      email: 'admin@example.com',
    },
  });

  console.log('✅ Created default company:', company.id);

  // Create a default admin user
  const bcrypt = require('bcrypt');
  const hashedPassword = await bcrypt.hash('admin123', 12);

  const user = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'admin',
      companyId: company.id,
    },
  });

  console.log('✅ Created admin user:', user.email);

  // Create some default materials
  await prisma.material.createMany({
    data: [
      {
        name: 'PLA Standard',
        costPerUnit: 20.0,
        printType: 'FDM',
        density: 1.24,
        companyId: company.id,
      },
      {
        name: 'PETG',
        costPerUnit: 25.0,
        printType: 'FDM',
        density: 1.27,
        companyId: company.id,
      },
      {
        name: 'Standard Resin',
        costPerUnit: 30.0,
        printType: 'Resin',
        density: 1.1,
        companyId: company.id,
      },
    ],
  });

  console.log('✅ Created default materials');

  // Create some default machines
  await prisma.machine.createMany({
    data: [
      {
        name: 'Prusa i3 MK3S+',
        hourlyCost: 2.5,
        powerConsumption: 120,
        printType: 'FDM',
        companyId: company.id,
      },
      {
        name: 'Creality Ender 3',
        hourlyCost: 1.5,
        powerConsumption: 100,
        printType: 'FDM',
        companyId: company.id,
      },
      {
        name: 'Elegoo Mars 3',
        hourlyCost: 3.0,
        powerConsumption: 60,
        printType: 'Resin',
        companyId: company.id,
      },
    ],
  });

  console.log('✅ Created default machines');
  console.log('🎉 Seeding completed!');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
