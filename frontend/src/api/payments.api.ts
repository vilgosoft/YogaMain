import client from './client';
import type { ApiResponse } from '@/types/api.types';
import type { PaymentInitResponse, PaymentStatusResponse } from '@/types/payment.types';

export async function initiatePayment(courseId: number): Promise<PaymentInitResponse> {
  const res = await client.post<ApiResponse<PaymentInitResponse>>('/payments/phonepe-init', {
    course_id: courseId,
  });
  return res.data.data!;
}

export async function getPaymentStatus(merchantTxnId: string): Promise<PaymentStatusResponse> {
  const res = await client.get<ApiResponse<PaymentStatusResponse>>(`/payments/status/${merchantTxnId}`);
  return res.data.data!;
}
