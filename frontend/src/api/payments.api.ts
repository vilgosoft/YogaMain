import client from './client';
import type { ApiResponse } from '@/types/api.types';
import type { PaymentInitResponse, PaymentStatusResponse } from '@/types/payment.types';

export async function initiatePayment(
  courseId: number,
  planCode?: string
): Promise<PaymentInitResponse> {
  const body: { course_id: number; plan_code?: string } = { course_id: courseId };
  if (planCode) {
    body.plan_code = planCode;
  }
  const res = await client.post<ApiResponse<PaymentInitResponse>>('/payments/phonepe-init', body);
  return res.data.data!;
}

export async function getPaymentStatus(merchantTxnId: string): Promise<PaymentStatusResponse> {
  const res = await client.get<ApiResponse<PaymentStatusResponse>>(`/payments/status/${merchantTxnId}`);
  return res.data.data!;
}
