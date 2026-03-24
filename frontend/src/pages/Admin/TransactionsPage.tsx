import { useState, useEffect, useCallback } from 'react';
import { getAdminTransactions } from '@/api/admin.api';
import { DataTable, type Column } from '@/components/ui/DataTable/DataTable';
import { Pagination } from '@/components/ui/Pagination/Pagination';
import type { PaginationMeta } from '@/types/api.types';
import type { Transaction } from '@/types/payment.types';
import styles from './AdminPage.module.scss';

type TxnRow = Transaction & { user_name?: string; user_email?: string; course_title?: string };

export function TransactionsPage() {
  const [txns, setTxns] = useState<TxnRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, per_page: 12, total: 0, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

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

  const columns: Column<TxnRow>[] = [
    { key: 'merchant_txn_id', header: 'Transaction ID', render: (r) => r.merchant_txn_id.substring(0, 20) + '...' },
    { key: 'user_name', header: 'User', render: (r) => r.user_name ?? '—' },
    { key: 'user_email', header: 'Email', render: (r) => r.user_email ?? '—' },
    { key: 'course_title', header: 'Course', render: (r) => r.course_title ?? '—' },
    { key: 'amount', header: 'Amount', render: (r) => `₹${Number(r.amount).toLocaleString('en-IN')}` },
    {
      key: 'status', header: 'Status',
      render: (r) => (
        <span className={`${styles.statusBadge} ${styles[`statusBadge--${r.status}`]}`}>{r.status}</span>
      ),
    },
    {
      key: 'created_at', header: 'Date',
      render: (r) => new Date(r.created_at).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div className={styles.header}>
        <h2>Transactions</h2>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem', background: '#111427', border: '1px solid #1E2140',
              borderRadius: 8, color: '#fff', fontSize: '0.875rem',
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
    </div>
  );
}
