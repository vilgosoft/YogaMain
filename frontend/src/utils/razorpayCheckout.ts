/** Response passed to Checkout `handler` on successful payment. */
export interface RazorpaySuccessPayload {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

type RazorpayConstructor = new (options: Record<string, unknown>) => { open: () => void };

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('No window'));
  }
  if (window.Razorpay) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Razorpay script failed')), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Razorpay script failed'));
    document.body.appendChild(s);
  });
}

export interface OpenRazorpayCheckoutParams {
  key: string;
  orderId: string;
  amount: number;
  currency: string;
  businessName: string;
  description: string;
  prefill?: { email?: string; name?: string };
  handler: (response: RazorpaySuccessPayload) => void;
  onDismiss?: () => void;
}

export function openRazorpayCheckout(params: OpenRazorpayCheckoutParams): void {
  const Razorpay = window.Razorpay;
  if (!Razorpay) {
    throw new Error('Razorpay is not loaded');
  }

  const rzp = new Razorpay({
    key: params.key,
    order_id: params.orderId,
    amount: params.amount,
    currency: params.currency,
    name: params.businessName,
    description: params.description,
    prefill: params.prefill,
    theme: { color: '#7c3aed' },
    handler: (response: RazorpaySuccessPayload) => {
      params.handler(response);
    },
    modal: {
      ondismiss: () => {
        params.onDismiss?.();
      },
    },
  });

  rzp.open();
}
