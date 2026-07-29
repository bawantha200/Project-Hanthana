import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = 'http://localhost:5000/api';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const PAGE_SIZE = 10;

export default function SystemActivity() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [actions, setActions] = useState([]);
  const [actionFilter, setActionFilter] = useState('all');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Fetch the distinct action list once, for the filter dropdown
  const fetchActions = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/audit-logs/actions`, {
        headers: getAuthHeaders(),
      });
      if (data.success) setActions(data.data || []);
    } catch (err) {
      console.error('Fetch Audit Log Actions Error:', err);
      // Non-fatal — the filter dropdown just won't have options
    }
  }, []);

  // Fetch a page of audit logs, filtered by action if one is selected
  const fetchAuditLogs = useCallback(async (pageToFetch, action) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/audit-logs`, {
        headers: getAuthHeaders(),
        params: {
          page: pageToFetch,
          limit: PAGE_SIZE,
          ...(action && action !== 'all' ? { action } : {}),
        },
      });
      if (data.success) {
        setLogs(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Fetch Audit Logs Error:', err);
      toast.error(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  useEffect(() => {
    fetchAuditLogs(page, actionFilter);
  }, [fetchAuditLogs, page, actionFilter]);

  // Reset to page 1 whenever the filter changes
  useEffect(() => {
    setPage(1);
  }, [actionFilter]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Activity</h1>
        <p className="text-sm text-gray-500 mt-1">
          Full audit log of account &amp; system events
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Action</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 bg-white"
          >
            <option value="all">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto text-xs text-gray-400">
          {total} event{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Feed */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-gray-400 text-sm">
            <Activity size={22} className="text-gray-300" />
            No activity to show.
          </div>
        ) : (
          <ul className="space-y-3">
            {logs.map((log) => (
              <li key={log.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-blue-600 bg-blue-50">
                  <Activity size={14} />
                </div>
                <div>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium text-gray-900">
                      {log.profiles?.full_name || log.details?.email || 'Unknown user'}
                    </span>{' '}
                    performed <span className="font-medium">{log.action}</span>
                    {log.ip_address ? (
                      <span className="text-gray-400"> from {log.ip_address}</span>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination (server-side) */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}