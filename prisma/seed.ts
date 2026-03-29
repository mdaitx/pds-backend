/**
 * Seed: categorias de despesas do sistema.
 * Rode: npx prisma db seed
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SYSTEM_CATEGORIES = [
  { name: 'Combustível', icon: 'fuel', color: '#ef4444' },
  { name: 'Pedágio', icon: 'road', color: '#f59e0b' },
  { name: 'Alimentação', icon: 'utensils', color: '#10b981' },
  { name: 'Manutenção', icon: 'wrench', color: '#6366f1' },
  { name: 'Hospedagem', icon: 'bed', color: '#8b5cf6' },
  { name: 'Outros', icon: 'receipt', color: '#6b7280' },
];

async function main() {
  for (const cat of SYSTEM_CATEGORIES) {
    const existing = await prisma.expenseCategory.findFirst({
      where: { companyId: null, name: cat.name },
    });
    if (!existing) {
      await prisma.expenseCategory.create({
        data: { ...cat, companyId: null },
      });
      console.log(`Criada categoria: ${cat.name}`);
    }
  }
  console.log('Seed concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
