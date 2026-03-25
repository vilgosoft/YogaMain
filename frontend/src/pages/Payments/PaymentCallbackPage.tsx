import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getPaymentStatus } from '@/api/payments.api';
import type { PaymentStatusResponse } from '@/types/payment.types';
import { Button } from '@/components/ui/Button/Button';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { PageWrapper } from '@/components/layout/PageWrapper/PageWrapper';
import { ROUTES } from '@/utils/constants';
import { HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineExclamationTriangle } from 'react-icons/hi2';
import styles from './PaymentCallbackPage.module.scss';

type Status = 'polling' | 'success' | 'failed' | 'timeout';

export function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const merchantTxnId =
    searchParams.get('merchant_txn_id') ||
    searchParams.get('transactionId') ||
    searchParams.get('txn') ||
    '';

  const [status, setStatus] = useState<Status>(() => (merchantTxnId ? 'polling' : 'failed'));
  const [, setPaymentData] = useState<PaymentStatusResponse | null>(null);
  const pollCount = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!merchantTxnId) {
      return;
    }

    const poll = async () => {
      try {
        const result = await getPaymentStatus(merchantTxnId);
        setPaymentData(result);

        if (result.status === 'success') {
          setStatus('success');
          if (timerRef.current) clearInterval(timerRef.current);
        } else if (result.status === 'failed') {
          setStatus('failed');
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          pollCount.current += 1;
          if (pollCount.current >= 10) {
            setStatus('timeout');
            if (timerRef.current) clearInterval(timerRef.current);
          }
        }
      } catch {
        pollCount.current += 1;
        if (pollCount.current >= 10) {
          setStatus('timeout');
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }
    };

    poll();
    timerRef.current = setInterval(poll, 3000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [merchantTxnId]);

  return (
    <PageWrapper>
      <div className={styles.page}>
        {status === 'polling' && (
          <div className={styles.card}>
            <Spinner />
            <h2>Verifying your payment...</h2>
            <p>Please wait while we confirm your transaction.</p>
          </div>
        )}

        {status === 'success' && (
          <div className={`${styles.card} ${styles.success}`}>
            <HiOutlineCheckCircle size={64} className={styles.iconSuccess} />
            <h2>Payment Successful!</h2>
            <p>You have been enrolled in the course. Start learning now!</p>
            <Button variant="primary" size="lg" onClick={() => navigate(ROUTES.MY_LEARNING)}>
              Go to My Learning
            </Button>
          </div>
        )}

        {status === 'failed' && (
          <div className={`${styles.card} ${styles.error}`}>
            <HiOutlineXCircle size={64} className={styles.iconError} />
            <h2>Payment Failed</h2>
            <p>Your payment could not be processed. Please try again.</p>
            <div className={styles.actions}>
              <Button variant="primary" onClick={() => navigate(ROUTES.COURSES)}>
                Browse Courses
              </Button>
              <Button variant="outline" onClick={() => navigate(ROUTES.HOME)}>
                Go Home
              </Button>
            </div>
          </div>
        )}

        {status === 'timeout' && (
          <div className={`${styles.card} ${styles.warning}`}>
            <HiOutlineExclamationTriangle size={64} className={styles.iconWarning} />
            <h2>Verification Pending</h2>
            <p>We couldn&apos;t confirm your payment yet. If the amount was deducted, it will be reflected shortly.</p>
            <div className={styles.actions}>
              <Button variant="primary" onClick={() => navigate(ROUTES.MY_LEARNING)}>
                Check My Learning
              </Button>
              <Button variant="outline" onClick={() => navigate(ROUTES.HOME)}>
                Go Home
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
