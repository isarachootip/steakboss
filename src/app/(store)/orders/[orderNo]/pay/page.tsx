import { notFound } from "next/navigation";
import { getOrderPaymentDetail } from "@/services/payment.service";
import { PaymentPanel } from "@/components/store/PaymentPanel";

export const dynamic = "force-dynamic";

export default async function OrderPaymentPage({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const { orderNo } = await params;
  const detail = await getOrderPaymentDetail(orderNo.toUpperCase());
  if (!detail) notFound();

  return (
    <div className="px-4 sm:px-6 py-10">
      <PaymentPanel
        orderNo={detail.order.orderNo}
        initialStatus={detail.order.status}
        customerName={detail.order.customerName}
        paymentMethod={detail.order.paymentMethod}
        totalBaht={detail.order.totalBaht}
        promptpayId={detail.promptpayId}
        promptpayName={detail.promptpayName}
        qrDataUrl={detail.qrDataUrl}
        items={detail.order.items}
      />
    </div>
  );
}
