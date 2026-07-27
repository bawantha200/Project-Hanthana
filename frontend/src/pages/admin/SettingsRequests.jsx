import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const KEY_LABELS = {
  general: 'Home Settings',
  services: 'Services',
  team: 'About Us / Team',
  notifications: 'Notifications',
  security: 'Security',
  system: 'System',
};

const FIELD_LABELS = {
  companyName: 'Company Name',
  companyEmail: 'Company Email',
  companyPhone: 'Company Phone',
  address: 'Address',
  heroImageUrl: 'Hero Background Image',
  contactPhone: 'Contact Phone (Hotline)',
  contactEmail: 'Support Email',
  ordersEmail: 'Orders Email',
  emergencyPhone: 'Emergency Phone',
  mondaySaturday: 'Business Hours (Mon–Sat)',
  sunday: 'Business Hours (Sunday)',
  emergency: 'Emergency Hours',
  stats: 'Stat',
  label: 'Label',
  value: 'Value',
  name: 'Name',
  description: 'Description',
  icon: 'Icon',
  features: 'Features',
  role: 'Role',
  photoUrl: 'Photo',
  orderAlerts: 'Order Alerts',
  deliveryUpdates: 'Delivery Updates',
  lowStockAlerts: 'Low Stock Alerts',
  paymentReminders: 'Payment Reminders',
  systemMaintenance: 'System Maintenance',
  emailNotifications: 'Email Notifications',
  smsNotifications: 'SMS Notifications',
  pushNotifications: 'Push Notifications',
  twoFactorAuth: 'Two-Factor Authentication',
  sessionTimeout: 'Session Timeout',
  passwordExpiry: 'Password Expiry',
  ipWhitelist: 'IP Whitelist',
  loginAttempts: 'Max Login Attempts',
  auditLogging: 'Audit Logging',
  autoBackup: 'Auto Backup',
  backupFrequency: 'Backup Frequency',
  dataRetention: 'Data Retention',
  maintenanceMode: 'Maintenance Mode',
  apiRateLimit: 'API Rate Limit',
  debugMode: 'Debug Mode',
};

// diff eken exclude karanna one keys — meka wenas una nisa noise witharak, meaningful eka nemei
const EXCLUDED_KEYS = ['id'];

const getFieldLabel = (key) => FIELD_LABELS[key] || key;

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const formatValue = (val) => {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  return String(val);
};

const IMAGE_FIELD_LABELS = ['Hero Background Image', 'Photo'];

const isImageUrl = (label, val) => {
  if (!val || typeof val !== 'string') return false;
  const looksLikeImage = /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(val);
  const labelIsImage = IMAGE_FIELD_LABELS.some((l) => label.includes(l));
  return looksLikeImage || labelIsImage;
};

/**
 * Old value ekath, new value ekath deep widihata compare karala,
 * actual wenas unu leaf-level fields witharak return karanawa.
 * Arrays -> item by item compare karanawa (Item 1, Item 2...)
 * Objects -> key by key recursively compare karanawa
 */
const deepDiff = (oldVal, newVal, path = '') => {
  const diffs = [];

  if (Array.isArray(oldVal) || Array.isArray(newVal)) {
    const oldArr = Array.isArray(oldVal) ? oldVal : [];
    const newArr = Array.isArray(newVal) ? newVal : [];
    const maxLen = Math.max(oldArr.length, newArr.length);
    for (let i = 0; i < maxLen; i++) {
      const itemLabel = path ? `${path} · Item ${i + 1}` : `Item ${i + 1}`;
      diffs.push(...deepDiff(oldArr[i], newArr[i], itemLabel));
    }
    return diffs;
  }

  if (isPlainObject(oldVal) || isPlainObject(newVal)) {
    const oldObj = isPlainObject(oldVal) ? oldVal : {};
    const newObj = isPlainObject(newVal) ? newVal : {};
    const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    keys.forEach((k) => {
      if (EXCLUDED_KEYS.includes(k)) return;
      const childLabel = path ? `${path} · ${getFieldLabel(k)}` : getFieldLabel(k);
      diffs.push(...deepDiff(oldObj[k], newObj[k], childLabel));
    });
    return diffs;
  }

  const oldStr = oldVal === undefined || oldVal === null ? '' : String(oldVal);
  const newStr = newVal === undefined || newVal === null ? '' : String(newVal);
  if (oldStr !== newStr) {
    diffs.push({ label: path || 'Value', before: formatValue(oldVal), after: formatValue(newVal) });
  }
  return diffs;
};

function DiffViewer({ changes, previousValues }) {
  return (
    <div className="space-y-4">
      {Object.entries(changes).map(([key, newValue]) => {
        const oldValue = previousValues?.[key];
        const diffs = deepDiff(oldValue, newValue);
        if (diffs.length === 0) return null; // wenas unu ekak naha nam pennanne na

        return (
          <div key={key} className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
              {KEY_LABELS[key] || key}
            </p>
            <div className="space-y-2.5">
              {diffs.map((d, i) => {
                const showImage = isImageUrl(d.label, d.before) || isImageUrl(d.label, d.after);

                return (
                    <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-3 text-sm border-b border-gray-50 last:border-0 pb-2.5 last:pb-0"
                    >
                    <span className="font-medium text-gray-700 sm:w-56 flex-shrink-0">{d.label}</span>

                    {showImage ? (
                        <div className="flex items-center gap-3">
                        <div className="text-center">
                            <img
                            src={d.before !== '—' ? d.before : '/images/no-image-placeholder.png'}
                            alt="Before"
                            className="w-20 h-16 object-cover rounded-lg border border-red-200"
                            onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <p className="text-[10px] text-red-500 mt-1">Before</p>
                        </div>
                        <span className="text-gray-300">→</span>
                        <div className="text-center">
                            <img
                            src={d.after !== '—' ? d.after : '/images/no-image-placeholder.png'}
                            alt="After"
                            className="w-20 h-16 object-cover rounded-lg border border-emerald-300"
                            onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <p className="text-[10px] text-emerald-600 mt-1">After</p>
                        </div>
                        </div>
                    ) : (
                        <>
                        <span className="px-2 py-1 rounded-lg bg-red-50 text-red-600 text-xs break-words">{d.before}</span>
                        <span className="text-gray-300 hidden sm:inline">→</span>
                        <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium break-words">{d.after}</span>
                        </>
                    )}
                    </div>
                );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    pending: { icon: Clock, cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    approved: { icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    rejected: { icon: XCircle, cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  }[status];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.cls}`}>
      <Icon size={12} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function SettingsRequests() {
  const { user } = useAuth();
  const role = (user?.role || '').toString().trim().toUpperCase();
  const isCEO = role === 'CEO';

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [expandedId, setExpandedId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = statusFilter === 'ALL'
        ? 'http://localhost:5000/api/settings/requests'
        : `http://localhost:5000/api/settings/requests?status=${statusFilter}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setRequests(data.data || []);
    } catch (err) {
      console.error('Fetch settings requests error:', err);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/settings/requests/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success('Request approved — settings updated.');
      fetchRequests();
    } catch (err) {
      toast.error(err.message || 'Failed to approve request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) {
      toast.error('Please enter a reason for rejection.');
      return;
    }
    setActionLoading(id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/settings/requests/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success('Request rejected.');
      setRejectingId(null);
      setRejectReason('');
      fetchRequests();
    } catch (err) {
      toast.error(err.message || 'Failed to reject request');
    } finally {
      setActionLoading(null);
    }
  };

  
const markRejectedSeen = async () => {
  try {
    const token = localStorage.getItem('token');
    await fetch('http://localhost:5000/api/settings/requests/mark-seen', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    setRequests((prev) =>
      prev.map((r) => (r.status === 'rejected' ? { ...r, admin_seen: true } : r))
    );
  } catch (err) {
    console.error('Failed to mark requests as seen:', err);
  }
};

  const markSingleRequestSeen = async (requestId) => {
  try {
    const token = localStorage.getItem('token');
    await fetch(`http://localhost:5000/api/settings/requests/${requestId}/mark-seen`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, admin_seen: true } : r))
    );
  } catch (err) {
    console.error('Failed to mark request as seen:', err);
  }
};

  const statusTabs = ['pending', 'approved', 'rejected', 'ALL'];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Settings Requests</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isCEO
            ? 'Review and approve settings changes submitted by Admins.'
            : 'Track the status of your submitted settings changes.'}
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 w-fit">
        
{statusTabs.map((s) => (
  <button
    key={s}
    onClick={() => setStatusFilter(s)}
    className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 capitalize ${
      statusFilter === s ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
    }`}
  >
    {s === 'ALL' ? 'All' : s}
    {!isCEO && s === 'rejected' && requests.some(r => r.status === 'rejected' && !r.admin_seen) && (
      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
    )}
  </button>
))}
      </motion.div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : requests.length === 0 ? (
        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center text-gray-400 text-sm">
          No {statusFilter !== 'ALL' ? statusFilter : ''} requests found.
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="space-y-4">
          {requests.map((req) => {
            const isExpanded = expandedId === req.id;
            const changedKeys = Object.keys(req.changes).filter((key) => {
    const oldValue = req.previous_values?.[key];
    return deepDiff(oldValue, req.changes[key]).length > 0;
  });
            return (
              <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button
  onClick={() => {
    const willExpand = expandedId !== req.id;
    setExpandedId(willExpand ? req.id : null);
    if (!isCEO && req.status === 'rejected' && !req.admin_seen && willExpand) {
      markSingleRequestSeen(req.id);
    }
  }}
  className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors text-left"
>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={req.status} />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {Object.keys(req.changes).map((k) => KEY_LABELS[k] || k).join(', ')}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        By {req.requested_by_user?.full_name || req.requested_by_user?.email || 'Unknown'} ·{' '}
                        {new Date(req.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                    <DiffViewer changes={req.changes} previousValues={req.previous_values} />

                    {req.status === 'rejected' && req.reject_reason && (
                      <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                        <p className="text-xs font-medium text-rose-700">Rejection Reason</p>
                        <p className="text-sm text-rose-600 mt-1">{req.reject_reason}</p>
                      </div>
                    )}

                    {req.status === 'approved' && req.reviewed_by_user && (
                      <p className="text-xs text-gray-400">
                        Approved by {req.reviewed_by_user.full_name || req.reviewed_by_user.email} on{' '}
                        {new Date(req.reviewed_at).toLocaleString()}
                      </p>
                    )}

                    {/* CEO ta witharak Approve/Reject buttons pennanawa, request eka pending nam witharak */}
                    {isCEO && req.status === 'pending' && (
                      <div className="pt-2 border-t border-gray-100">
                        {rejectingId === req.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Reason for rejection..."
                              rows={2}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all resize-none"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleReject(req.id)}
                                disabled={actionLoading === req.id}
                                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50"
                              >
                                Confirm Reject
                              </button>
                              <button
                                onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApprove(req.id)}
                              disabled={actionLoading === req.id}
                              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                              <Check size={15} /> Approve
                            </button>
                            <button
                              onClick={() => setRejectingId(req.id)}
                              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
                            >
                              <X size={15} /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}