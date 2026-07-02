import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Fixed-order categorical palette (validated for CVD-safe adjacency — see dataviz skill)
const PALETTE = ["#2a78d6", "#1baf7a", "#eda100", "#008300", "#4a3aa7", "#e34948", "#e87ba4", "#eb6834"];

const DEFAULT_CATEGORIES: { name: string; kind: "INCOME" | "EXPENSE"; color: string }[] = [
  { name: "Salary", kind: "INCOME", color: PALETTE[1] },
  { name: "Freelance/Other Income", kind: "INCOME", color: PALETTE[3] },
  { name: "Interest/Dividends", kind: "INCOME", color: PALETTE[0] },
  { name: "Groceries", kind: "EXPENSE", color: PALETTE[7] },
  { name: "Rent/Housing", kind: "EXPENSE", color: PALETTE[5] },
  { name: "Utilities", kind: "EXPENSE", color: PALETTE[2] },
  { name: "Dining Out", kind: "EXPENSE", color: PALETTE[6] },
  { name: "Transport/Fuel", kind: "EXPENSE", color: PALETTE[0] },
  { name: "Healthcare", kind: "EXPENSE", color: PALETTE[1] },
  { name: "Shopping", kind: "EXPENSE", color: PALETTE[4] },
  { name: "Entertainment", kind: "EXPENSE", color: PALETTE[6] },
  { name: "Education", kind: "EXPENSE", color: PALETTE[4] },
  { name: "Insurance", kind: "EXPENSE", color: PALETTE[2] },
  { name: "Investments", kind: "EXPENSE", color: PALETTE[0] },
  { name: "Miscellaneous", kind: "EXPENSE", color: "#898781" },
];

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found yet — run the app's setup flow first, then re-run this seed.");
    return;
  }
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { userId_name_kind: { userId: user.id, name: cat.name, kind: cat.kind } },
      update: {},
      create: { ...cat, userId: user.id },
    });
  }
  console.log(`Seeded ${DEFAULT_CATEGORIES.length} default categories for ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
