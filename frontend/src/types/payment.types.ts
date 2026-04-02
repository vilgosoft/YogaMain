export interface Transaction {
  id: number;
  user_id: number;
  course_id: number;
  merchant_txn_id: string;
  phonepe_txn_id: string | null;
  amount: number;
  status: 'initiated' | 'pending' | 'success' | 'failed' | 'refunded';
  payment_method: string | null;
  created_at: string;
}

export interface PaymentInitResponse {
  merchant_txn_id?: string;
  /** Present when backend enrolled a free course (no payment gateway). */
  status?: 'enrolled';
  /** Razorpay Checkout (Orders API). */
  razorpay_key_id?: string;
  razorpay_order_id?: string;
  /** Amount in paise (integer). */
  amount?: number;
  currency?: string;
  course_title?: string;
  prefill_email?: string;
  prefill_name?: string;
}

export interface PaymentStatusResponse {
  status: Transaction['status'];
  merchant_txn_id: string;
  course_id: number;
}
