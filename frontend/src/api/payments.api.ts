import client from './client';
import type { ApiResponse } from '@/types/api.types';
import type { PaymentInitResponse, PaymentStatusResponse } from '@/types/payment.types';

export async function initiatePayment(
  courseId: number,
  planCode?: string
): Promise<PaymentInitResponse> {
  const body: { course_id: number; plan_code?: string } = { course_id: courseId };
  if (planCode != null && String(planCode).trim() !== '') {
    body.plan_code = String(planCode).trim();
  }
  const res = await client.post<ApiResponse<PaymentInitResponse>>('/payments/initiate', body);
  return res.data.data!;
}

export interface VerifyPaymentPayload {
  merchant_txn_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function verifyPayment(payload: VerifyPaymentPayload): Promise<PaymentStatusResponse> {
  const res = await client.post<ApiResponse<PaymentStatusResponse>>('/payments/verify', payload);
  return res.data.data!;
}

export async function getPaymentStatus(merchantTxnId: string): Promise<PaymentStatusResponse> {
  const res = await client.get<ApiResponse<PaymentStatusResponse>>(`/payments/status/${merchantTxnId}`);
  return res.data.data!;
}
