const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateSections() {
  console.log('Updating warehouse sections to the 7 defined zones...');

  const targetSections = [
    { code: 'SEC-01', name: 'วัตถุดิบแห้ง', description: 'จัดเก็บวัตถุดิบผง สารสกัดแห้ง และเคมีภัณฑ์ชนิดแห้ง' },
    { code: 'SEC-02', name: 'วัตถุดิบน้ำ', description: 'จัดเก็บตัวทำละลาย แอลกอฮอล์ น้ำมัน และสารเคมีชนิดเหลว' },
    { code: 'SEC-03', name: 'หัวเชื้อ', description: 'จัดเก็บหัวเชื้อน้ำหอม สารออกฤทธิ์เข้มข้น และหัวเชื้อเครื่องสำอาง/อาหาร' },
    { code: 'SEC-04', name: 'ผลิตภัณฑ์ชนิดน้ำ', description: 'จัดเก็บสินค้าสำเร็จรูปหรือกึ่งสำเร็จรูปประเภทของเหลว เซรั่ม โลชั่น สเปรย์' },
    { code: 'SEC-05', name: 'ผลิตภัณฑ์ชนิดผง', description: 'จัดเก็บสินค้าสำเร็จรูปหรือกึ่งสำเร็จรูปประเภทผงชงดื่ม ผงแป้ง' },
    { code: 'SEC-06', name: 'ผลิตภัณฑ์เม็ด', description: 'จัดเก็บสินค้าสำเร็จรูปประเภทเม็ดตอก เม็ดเคี้ยว ยาเม็ด' },
    { code: 'SEC-07', name: 'ผลิตภัณฑ์แคปซูล', description: 'จัดเก็บสินค้าสำเร็จรูปประเภทแคปซูลเจลาติน แคปซูลพืช ซอฟต์เจล' },
  ];

  // 1. Create or update each of the 7 sections
  const createdSections = {};
  for (const s of targetSections) {
    const sec = await prisma.section.upsert({
      where: { code: s.code },
      update: { name: s.name, description: s.description },
      create: { code: s.code, name: s.name, description: s.description },
    });
    createdSections[s.name] = sec.id;
  }

  // 2. Re-assign existing materials to suitable new zones
  const drySecId = createdSections['วัตถุดิบแห้ง'];
  const liquidSecId = createdSections['วัตถุดิบน้ำ'];
  const essenceSecId = createdSections['หัวเชื้อ'];

  // Ethanol -> วัตถุดิบน้ำ
  await prisma.material.updateMany({
    where: { OR: [{ code: { contains: 'ETH' } }, { name: { contains: 'แอลกอฮอล์' } }] },
    data: { sectionId: liquidSecId },
  });

  // Carbomer -> วัตถุดิบแห้ง
  await prisma.material.updateMany({
    where: { OR: [{ code: { contains: 'CRB' } }, { name: { contains: 'คาร์โบเมอร์' } }] },
    data: { sectionId: drySecId },
  });

  // TEA / Aroma -> หัวเชื้อ
  await prisma.material.updateMany({
    where: { OR: [{ code: { contains: 'TEA' } }, { code: { contains: 'ARO' } }, { name: { contains: 'หัวน้ำหอม' } }] },
    data: { sectionId: essenceSecId },
  });

  console.log('Successfully updated warehouse sections!');
}

updateSections()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
