import prisma from '@/lib/prisma';
import PrintControls from '@/components/PrintControls';
import { formatDate } from '@/lib/dateUtils';

export const revalidate = 0;

export default async function PrintRequisitionPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await prisma.productionOrder.findUnique({
    where: { id: params.id },
    include: {
      product: true,
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

  const orderDate = formatDate(order.createdAt);

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 sm:p-10 shadow-sm border border-slate-200 rounded-2xl print:shadow-none print:border-none print:p-0 print:max-w-none">
      {/* Client Controls (Print & PDF download) */}
      <PrintControls orderNo={order.orderNo} />

      {/* Printable Document Sheet */}
      <div className="print-sheet space-y-6">
        {/* Printable Document Header */}
        <div className="text-center pb-5 border-b-2 border-slate-800">
          <h2 className="text-xl font-extrabold text-slate-900 uppercase tracking-wide">
            บริษัท บีเอ็มพี อินเตอร์เนชั่นแนล จำกัด (BMP)
          </h2>
          <h1 className="text-lg font-bold text-slate-800 mt-1">
            ใบเบิกวัตถุดิบเพื่อการผลิต (Material Requisition Slip)
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            แบบฟอร์มบันทึกการเบิกจ่ายวัตถุดิบและสารเคมีตามสูตรมาตรฐาน (BOM)
          </p>
        </div>

        {/* Meta Information Grid */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 print:bg-transparent print:border print:border-slate-300">
          <div className="space-y-1.5">
            <p>
              <strong>เลขที่ใบเบิก:</strong> <span className="font-mono font-bold text-slate-900 text-sm">{order.orderNo}</span>
            </p>
            <p>
              <strong>สินค้าที่จะผลิต:</strong> <span className="font-bold text-slate-900">{order.product.name}</span> ({order.product.code})
            </p>
            <p>
              <strong>จำนวนยอดผลิต:</strong> <span className="font-bold text-indigo-800">{order.targetQuantity.toLocaleString()}</span> {order.product.unit}
            </p>
          </div>
          <div className="space-y-1.5 text-right">
            <p>
              <strong>วันที่ขอเบิก:</strong> <span className="font-medium text-slate-900">{orderDate}</span>
            </p>
            <p>
              <strong>ผู้ขอเบิก / แผนก:</strong> <span className="font-medium text-slate-900">{order.requestedBy || '-'}</span>
            </p>
            <p>
              <strong>สถานะการตัดจ่าย:</strong>{' '}
              <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                order.status === 'ISSUED'
                  ? 'bg-emerald-100 text-emerald-800 print:bg-transparent print:text-black'
                  : 'bg-amber-100 text-amber-800 print:bg-transparent print:text-black'
              }`}>
                {order.status === 'ISSUED' ? 'ตัดสต็อกแล้ว (ISSUED)' : 'ฉบับร่าง'}
              </span>
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div>
          <table className="w-full text-left text-xs border border-slate-300">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
              <tr>
                <th className="py-2.5 px-3 border-r border-slate-300 text-center w-12">ลำดับ</th>
                <th className="py-2.5 px-3 border-r border-slate-300">รหัสวัตถุดิบ</th>
                <th className="py-2.5 px-3 border-r border-slate-300">ชื่อรายการวัตถุดิบ</th>
                <th className="py-2.5 px-3 border-r border-slate-300">เลขล็อต (Lot / Batch)</th>
                <th className="py-2.5 px-3 border-r border-slate-300">วันหมดอายุ (EXP)</th>
                <th className="py-2.5 px-3 text-right">จำนวนที่จ่าย</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {order.requisitionItems.map((item, idx) => {
                const expDateStr = formatDate(item.lot.expDate);
                return (
                  <tr key={item.id} className="text-slate-800">
                    <td className="py-2.5 px-3 border-r border-slate-300 text-center font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3 border-r border-slate-300 font-mono font-semibold">
                      {item.lot.material.code}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-300 font-medium">
                      {item.lot.material.name}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-300 font-mono font-bold text-blue-800">
                      {item.lot.lotNumber}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-300">
                      {expDateStr}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      {item.quantityDeducted.toLocaleString()} {item.lot.material.baseUnit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {order.notes && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs print:bg-transparent print:border-slate-300">
            <strong>หมายเหตุ:</strong> {order.notes}
          </div>
        )}

        {/* Signatures Section */}
        <div className="grid grid-cols-3 gap-6 pt-12 text-center text-xs text-slate-700 break-inside-avoid">
          <div>
            <div className="border-b border-slate-400 pb-1 mb-2 w-4/5 mx-auto"></div>
            <p className="font-semibold">(...................................................)</p>
            <p className="text-[11px] text-slate-500 mt-1">ผู้ขอเบิกวัตถุดิบ</p>
            <p className="text-[10px] text-slate-400 mt-0.5">วันที่ ...../...../.........</p>
          </div>

          <div>
            <div className="border-b border-slate-400 pb-1 mb-2 w-4/5 mx-auto"></div>
            <p className="font-semibold">(...................................................)</p>
            <p className="text-[11px] text-slate-500 mt-1">ผู้อนุมัติการจ่าย</p>
            <p className="text-[10px] text-slate-400 mt-0.5">วันที่ ...../...../.........</p>
          </div>

          <div>
            <div className="border-b border-slate-400 pb-1 mb-2 w-4/5 mx-auto"></div>
            <p className="font-semibold">( แสงอรุณ ศรีสุข )</p>
            <p className="text-[11px] text-slate-500 mt-1">เจ้าหน้าที่ผู้จ่ายของ / คลัง</p>
            <p className="text-[10px] text-slate-400 mt-0.5">วันที่ ...../...../.........</p>
          </div>
        </div>
      </div>
    </div>
  );
}
