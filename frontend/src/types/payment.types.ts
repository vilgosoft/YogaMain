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
  redirect_url: string;
  merchant_txn_id: string;
}

export interface PaymentStatusResponse {
  status: Transaction['status'];
  merchant_txn_id: string;
  course_id: number;
}
