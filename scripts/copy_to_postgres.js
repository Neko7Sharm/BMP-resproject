const { DatabaseSync } = require('node:sqlite');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const sqlite = new DatabaseSync('./prisma/dev.db');

async function migrate() {
  console.log('--- STARTING MIGRATION FROM SQLITE TO CLOUD POSTGRESQL ---');

  // 1. Sections
  const sections = sqlite.prepare('SELECT * FROM "Section"').all();
  console.log(`Migrating ${sections.length} Sections...`);
  for (const s of sections) {
    await prisma.section.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        code: s.code,
        name: s.name,
        description: s.description,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      },
    });
  }

  // 2. Materials
  const materials = sqlite.prepare('SELECT * FROM "Material"').all();
  console.log(`Migrating ${materials.length} Materials...`);
  for (const m of materials) {
    await prisma.material.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        code: m.code,
        name: m.name,
        sectionId: m.sectionId || null,
        baseUnit: m.baseUnit || 'kg',
        minSafetyStock: m.minSafetyStock || 0,
        createdAt: new Date(m.createdAt),
        updatedAt: new Date(m.updatedAt),
      },
    });
  }

  // 3. MaterialLots
  const lots = sqlite.prepare('SELECT * FROM "MaterialLot"').all();
  console.log(`Migrating ${lots.length} Material Lots...`);
  for (const l of lots) {
    await prisma.materialLot.upsert({
      where: { id: l.id },
      update: {},
      create: {
        id: l.id,
        materialId: l.materialId,
        lotNumber: l.lotNumber,
        receiveDate: new Date(l.receiveDate),
        mfgDate: l.mfgDate ? new Date(l.mfgDate) : null,
        expDate: l.expDate ? new Date(l.expDate) : null,
        initialQuantity: l.initialQuantity,
        quantityRemaining: l.quantityRemaining,
        costPerUnit: l.costPerUnit || 0,
        status: l.status || 'ACTIVE',
        createdAt: new Date(l.createdAt),
        updatedAt: new Date(l.updatedAt),
      },
    });
  }

  // 4. Products
  const products = sqlite.prepare('SELECT * FROM "Product"').all();
  console.log(`Migrating ${products.length} Products...`);
  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        code: p.code,
        name: p.name,
        unit: p.unit || 'ชิ้น',
        description: p.description,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      },
    });
  }

  // 5. RecipeItems
  const recipes = sqlite.prepare('SELECT * FROM "RecipeItem"').all();
  console.log(`Migrating ${recipes.length} Recipe Items...`);
  for (const r of recipes) {
    await prisma.recipeItem.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        productId: r.productId,
        materialId: r.materialId,
        quantityRequired: r.quantityRequired,
        unit: r.unit || 'kg',
        notes: r.notes,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      },
    });
  }

  // 6. ProductionOrders
  const orders = sqlite.prepare('SELECT * FROM "ProductionOrder"').all();
  console.log(`Migrating ${orders.length} Production Orders...`);
  for (const o of orders) {
    await prisma.productionOrder.upsert({
      where: { id: o.id },
      update: {},
      create: {
        id: o.id,
        orderNo: o.orderNo,
        productId: o.productId,
        targetQuantity: o.targetQuantity,
        status: o.status || 'DRAFT',
        requestedBy: o.requestedBy,
        approvedBy: o.approvedBy,
        notes: o.notes,
        issuedAt: o.issuedAt ? new Date(o.issuedAt) : null,
        createdAt: new Date(o.createdAt),
        updatedAt: new Date(o.updatedAt),
      },
    });
  }

  // 7. RequisitionItems
  const reqItems = sqlite.prepare('SELECT * FROM "RequisitionItem"').all();
  console.log(`Migrating ${reqItems.length} Requisition Items...`);
  for (const req of reqItems) {
    await prisma.requisitionItem.upsert({
      where: { id: req.id },
      update: {},
      create: {
        id: req.id,
        orderId: req.orderId,
        materialLotId: req.materialLotId,
        quantityDeducted: req.quantityDeducted,
        deductionRule: req.deductionRule || 'FEFO',
        createdAt: new Date(req.createdAt),
      },
    });
  }

  // 8. StockTransactions
  const transactions = sqlite.prepare('SELECT * FROM "StockTransaction"').all();
  console.log(`Migrating ${transactions.length} Stock Transactions...`);
  for (const tx of transactions) {
    await prisma.stockTransaction.upsert({
      where: { id: tx.id },
      update: {},
      create: {
        id: tx.id,
        materialId: tx.materialId,
        lotId: tx.lotId || null,
        type: tx.type,
        quantity: tx.quantity,
        lotBalanceAfter: tx.lotBalanceAfter,
        totalStockAfter: tx.totalStockAfter,
        transactionDate: new Date(tx.transactionDate),
        documentRef: tx.documentRef,
        remarks: tx.remarks,
        createdBy: tx.createdBy,
        createdAt: new Date(tx.createdAt),
      },
    });
  }

  console.log('--- ALL DATA MIGRATED TO CLOUD POSTGRESQL SUCCESSFULLY! ---');
  await prisma.$disconnect();
}

migrate().catch(e => {
  console.error('Migration error:', e);
  process.exit(1);
});
