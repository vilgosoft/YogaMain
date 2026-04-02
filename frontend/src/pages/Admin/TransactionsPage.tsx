import { useState, useEffect, useCallback } from 'react';
import { HiOutlineTrash } from 'react-icons/hi2';
import { getAdminTransactions, deleteAdminTransaction } from '@/api/admin.api';
import { DataTable, type Column } from '@/components/ui/DataTable/DataTable';
import { Pagination } from '@/components/ui/Pagination/Pagination';
import { Button } from '@/components/ui/Button/Button';
import { Modal } from '@/components/ui/Modal/Modal';
import { useToast } from '@/components/ui/Toast/Toast';
import { getApiErrorMessage } from '@/utils/apiErrors';
import type { PaginationMeta } from '@/types/api.types';
import type { Transaction } from '@/types/payment.types';
import adminStyles from './AdminPage.module.scss';
import styles from './TransactionsPage.module.scss';

type TxnRow = Transaction & { user_name?: string; user_email?: string; course_title?: string };

export function TransactionsPage() {
  const { showToast } = useToast();
  const [txns, setTxns] = useState<TxnRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, per_page: 12, total: 0, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [txnToDelete, setTxnToDelete] = useState<TxnRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page };
      if (statusFilter) params.status = statusFilter;
      const result = await getAdminTransactions(params);
      setTxns(result.data as TxnRow[]);
      setMeta(result.meta);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const closeDeleteModal = () => {
    if (deleting) return;
    setTxnToDelete(null);
  };

  const confirmDelete = async () => {
    if (!txnToDelete) return;
    setDeleting(true);
    try {
      await deleteAdminTransaction(txnToDelete.id);
      showToast('success', 'Transaction deleted');
      setTxnToDelete(null);
      await fetchData(meta.page);
    } catch (err) {
      showToast('error', getApiErrorMessage(err, 'Could not delete transaction'));
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<TxnRow>[] = [
    { key: 'merchant_txn_id', header: 'Transaction ID', render: (r) => r.merchant_txn_id.substring(0, 20) + '...' },
    { key: 'user_name', header: 'User', render: (r) => r.user_name ?? '—' },
    { key: 'user_email', header: 'Email', render: (r) => r.user_email ?? '—' },
    { key: 'course_title', header: 'Course', render: (r) => r.course_title ?? '—' },
    { key: 'amount', header: 'Amount', render: (r) => `₹${Number(r.amount).toLocaleString('en-IN')}` },
    {
      key: 'status', header: 'Status',
      render: (r) => (
        <span className={`${adminStyles.statusBadge} ${adminStyles[`statusBadge--${r.status}`]}`}>{r.status}</span>
      ),
    },
    {
      key: 'created_at', header: 'Date',
      render: (r) => new Date(r.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className={styles.actionCell}>
          <button
            type="button"
            className={styles.iconDelete}
            aria-label="Delete transaction"
            title="Delete transaction"
            onClick={() => setTxnToDelete(r)}
          >
            <HiOutlineTrash aria-hidden />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className={adminStyles.header}>
        <h2>Transactions</h2>
      </div>

      <div className={adminStyles.filters}>
        <div className={adminStyles.filterGroup}>
          <label style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              color: 'var(--color-text)',
              fontSize: '0.875rem',
            }}
          >
            <option value="">All</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      <DataTable columns={columns} data={txns} loading={loading} keyExtractor={(r) => r.id} emptyMessage="No transactions yet." />
      <Pagination meta={meta} onPageChange={fetchData} />

      <Modal isOpen={!!txnToDelete} onClose={closeDeleteModal} title="Delete transaction?" size="sm">
        {txnToDelete ? (
          <>
            <p className={styles.deleteWarning}>
              Remove this payment record permanently? This does not refund the customer via Razorpay — it only
              deletes the row in your database.
            </p>
            <p className={styles.deleteWarning}>
              <span className={styles.deleteHighlight}>{txnToDelete.merchant_txn_id}</span>
              {' · '}
              {txnToDelete.user_name ?? txnToDelete.user_email ?? 'User'} · ₹
              {Number(txnToDelete.amount).toLocaleString('en-IN')} · {txnToDelete.status}
            </p>
            <div className={styles.modalActions}>
              <Button type="button" variant="outline" onClick={closeDeleteModal} disabled={deleting}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                className={styles.dangerBtn}
                onClick={confirmDelete}
                isLoading={deleting}
              >
                Delete
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
