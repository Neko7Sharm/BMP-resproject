const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial warehouse and material data...');

  // 1. Clean existing data
  await prisma.requisitionItem.deleteMany({});
  await prisma.productionOrder.deleteMany({});
  await prisma.recipeItem.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.stockTransaction.deleteMany({});
  await prisma.materialLot.deleteMany({});
  await prisma.material.deleteMany({});
  await prisma.section.deleteMany({});

  // 2. Create Sections
  const sec1 = await prisma.section.create({
    data: {
      code: 'SEC-01',
      name: 'คลังวัตถุดิบเคมีและของเหลว (Zone A)',
      description: 'จัดเก็บสารเคมี ตัวทำละลาย และของเหลวไวไฟในห้องควบคุมอุณหภูมิ',
    },
  });

  const sec2 = await prisma.section.create({
    data: {
      code: 'SEC-02',
      name: 'คลังวัตถุดิบผงและสารสกัด (Zone B)',
      description: 'จัดเก็บสารสกัด สารเพิ่มความหนืด และผงแห้ง',
    },
  });

  const sec3 = await prisma.section.create({
    data: {
      code: 'SEC-03',
      name: 'คลังบรรจุภัณฑ์และหัวสเปรย์ (Zone C)',
      description: 'ขวดพลาสติก หัวปั๊ม และฉลากสินค้า',
    },
  });

  // 3. Create Materials & Lots (อ้างอิงจากแบบฟอร์ม Stock Card จริงของผู้ใช้)
  const matEthanol = await prisma.material.create({
    data: {
      code: 'RM-ETH-95',
      name: 'แอลกอฮอล์ 95% (Ethanol 95%)',
      baseUnit: 'kg',
      sectionId: sec1.id,
      minSafetyStock: 1000,
      lots: {
        create: [
          {
            lotNumber: '080826',
            receiveDate: new Date('2026-08-17'),
            expDate: new Date('2027-08-07'),
            initialQuantity: 1879,
            quantityRemaining: 482,
            costPerUnit: 45.0,
            status: 'ACTIVE',
          },
          {
            lotNumber: '200826',
            receiveDate: new Date('2026-08-21'),
            expDate: new Date('2027-08-19'),
            initialQuantity: 1894,
            quantityRemaining: 1894,
            costPerUnit: 45.0,
            status: 'ACTIVE',
          },
          {
            lotNumber: '120926',
            receiveDate: new Date('2026-09-14'),
            expDate: new Date('2027-09-11'),
            initialQuantity: 1873,
            quantityRemaining: 1873,
            costPerUnit: 46.5,
            status: 'ACTIVE',
          },
        ],
      },
    },
    include: { lots: true },
  });

  const matCarbomer = await prisma.material.create({
    data: {
      code: 'RM-CRB-940',
      name: 'คาร์โบเมอร์ 940 (Carbomer 940)',
      baseUnit: 'kg',
      sectionId: sec2.id,
      minSafetyStock: 20,
      lots: {
        create: [
          {
            lotNumber: 'CRB-2607',
            receiveDate: new Date('2026-07-01'),
            expDate: new Date('2028-07-01'),
            initialQuantity: 50,
            quantityRemaining: 38.5,
            costPerUnit: 520.0,
          },
        ],
      },
    },
    include: { lots: true },
  });

  const matTEA = await prisma.material.create({
    data: {
      code: 'RM-TEA-99',
      name: 'ไตรเอทาโนลามีน 99% (TEA)',
      baseUnit: 'kg',
      sectionId: sec1.id,
      minSafetyStock: 30,
      lots: {
        create: [
          {
            lotNumber: 'TEA-2608',
            receiveDate: new Date('2026-08-10'),
            expDate: new Date('2028-08-10'),
            initialQuantity: 100,
            quantityRemaining: 75.0,
            costPerUnit: 140.0,
          },
        ],
      },
    },
    include: { lots: true },
  });

  const matAroma = await prisma.material.create({
    data: {
      code: 'RM-ARO-PEP',
      name: 'หัวน้ำหอมกลิ่นเปปเปอร์มินต์ (Peppermint Oil)',
      baseUnit: 'kg',
      sectionId: sec1.id,
      minSafetyStock: 5,
      lots: {
        create: [
          {
            lotNumber: 'ARO-2609',
            receiveDate: new Date('2026-09-01'),
            expDate: new Date('2027-09-01'),
            initialQuantity: 20,
            quantityRemaining: 16.2,
            costPerUnit: 850.0,
          },
        ],
      },
    },
    include: { lots: true },
  });

  // 4. Create Initial Stock Transactions
  await prisma.stockTransaction.create({
    data: {
      materialId: matEthanol.id,
      lotId: matEthanol.lots[0].id,
      type: 'INBOUND',
      quantity: 1879,
      documentRef: '006/26',
      remarks: 'รับเข้าตามใบการ์ด EXP. 7/8/27',
      createdBy: 'แสงอรุณ ศรีสุข',
      transactionDate: new Date('2026-08-17'),
    },
  });

  // 5. Create Products & BOM Recipes
  const p1 = await prisma.product.create({
    data: {
      code: 'FG-GEL-500',
      name: 'เจลแอลกอฮอล์ทำความสะอาดมือ 500 ml',
      unit: 'ขวด',
      description: 'แอลกอฮอล์เจล 75% v/v สูตรไม่ต้องล้างออก',
      recipeItems: {
        create: [
          { materialId: matEthanol.id, quantityRequired: 0.38, unit: 'kg' },
          { materialId: matCarbomer.id, quantityRequired: 0.003, unit: 'kg' },
          { materialId: matTEA.id, quantityRequired: 0.002, unit: 'kg' },
        ],
      },
    },
  });

  const p2 = await prisma.product.create({
    data: {
      code: 'FG-SPR-100',
      name: 'สเปรย์แอลกอฮอล์กลิ่นเปปเปอร์มินต์ 100 ml',
      unit: 'ขวด',
      description: 'สเปรย์ฆ่าเชื้อพกพา แห้งไว ไม่เหนียวเหนอะหนะ',
      recipeItems: {
        create: [
          { materialId: matEthanol.id, quantityRequired: 0.08, unit: 'kg' },
          { materialId: matAroma.id, quantityRequired: 0.001, unit: 'kg' },
        ],
      },
    },
  });

  console.log('Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
