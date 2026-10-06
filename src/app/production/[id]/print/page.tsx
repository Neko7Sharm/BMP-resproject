import prisma from '@/lib/prisma';
import ProductionPrintSheets from '@/components/ProductionPrintSheets';

export const revalidate = 0;

export default async function PrintRequisitionPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await prisma.productionOrder.findUnique({
    where: { id: params.id },
    include: {
      product: {
        include: {
          recipeItems: {
            include: {
              material: true,
            },
          },
        },
      },
      requisitionItems: {
        include: {
          lot: {
            include: {
              material: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    return <div className="p-8 text-center text-rose-600">ไม่พบเอกสารคำสั่งผลิต</div>;
  }

  return <ProductionPrintSheets order={order as any} />;
}
