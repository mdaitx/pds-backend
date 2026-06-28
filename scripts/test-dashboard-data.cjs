#!/usr/bin/env node
require('dotenv').config();
const { PrismaClient, TripStatus } = require('@prisma/client');

const prisma = new PrismaClient();
const companyId = 'cmn5adrh40002l14wdm2bdf5l';

async function main() {
  const now = new Date();
  const oneYearStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  oneYearStart.setHours(0, 0, 0, 0);

  const trips = await prisma.trip.findMany({
    where: { companyId, startDate: { gte: oneYearStart } },
    select: { code: true, startDate: true, status: true, freightValue: true },
  });

  const mayStart = new Date(2026, 4, 1);
  const mayEnd = new Date(2026, 4, 31, 23, 59, 59, 999);
  const mayFaturamento = trips
    .filter(
      (t) =>
        t.status === TripStatus.COMPLETED &&
        t.startDate >= mayStart &&
        t.startDate <= mayEnd,
    )
    .reduce((s, t) => s + Number(t.freightValue ?? 0), 0);

  console.log(JSON.stringify({ tripCount: trips.length, mayFaturamento, trips }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
