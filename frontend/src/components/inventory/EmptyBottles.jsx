// frontend/src/components/inventory/EmptyBottles.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FlaskConical, Plus, RefreshCw, AlertTriangle, Calendar, 
  TrendingUp, Truck, X, Trash2, Package
} from 'lucide-react';
import toast from 'react-hot-toast';
import { inventoryAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Modal for adding empty bottles
const AddEmptyBottleModal = ({ isOpen, onClose, onSave, deliveries = [] }) => {
  const [formData, setFormData] = useState({
    source: 'delivery',
    delivery_id: '',
    quantity: 0,
    return_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        source: 'delivery',
        delivery_id: deliveries[0]?.id || '',
        quantity: 0,
        return_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }
  }, [isOpen, deliveries]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      if (formData.source === 'delivery') {
        if (!formData.delivery_id) {
          toast.error('Please select a delivery');
          setLoading(false);
          return;
        }
        await onSave({
          type: 'delivery',
          delivery_id: parseInt(formData.delivery_id),
          quantity: parseInt(formData.quantity),
          notes: formData.notes
        });
      } else {
        await onSave({
          type: 'manual',
          quantity: parseInt(formData.quantity),
          return_date: formData.return_date,
          notes: formData.notes
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <Package size={18} className="text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Add Empty Bottles</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            <strong>Note:</strong> Only 19L REFILL bottles can be tracked as empty returns.
          </div>

          {/* Source selection */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, source: 'delivery' })}
                className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                  formData.source === 'delivery'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Truck size={16} className="inline mr-1" />
                From Delivery
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, source: 'manual' })}
                className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                  formData.source === 'manual'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Plus size={16} className="inline mr-1" />
                Manual Entry
              </button>
            </div>
          </div>

          {/* Delivery selection */}
          {formData.source === 'delivery' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Select Delivery</label>
              <select
                value={formData.delivery_id}
                onChange={(e) => setFormData({ ...formData, delivery_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
                required
              >
                <option value="">Select a completed delivery...</option>
                {deliveries.map(d => (
                  <option key={d.id} value={d.id}>
                    Delivery #{d.id} - {d.delivery_end_time ? new Date(d.delivery_end_time).toLocaleDateString() : 'Date unknown'}
                    {d.collecting_empty_bottles > 0 && ` (${d.collecting_empty_bottles} already collected)`}
                  </option>
                ))}
              </select>
              {deliveries.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">No completed deliveries found</p>
              )}
            </div>
          )}

          {/* Manual entry date */}
          {formData.source === 'manual' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Return Date</label>
              <input
                type="date"
                value={formData.return_date}
                onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
                required
              />
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Quantity (bottles)</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
              min="1"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
              rows="2"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Add Bottles'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Delete confirmation modal
const DeleteModal = ({ isOpen, onClose, onConfirm, record }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Delete Record</h3>
            <p className="text-sm text-gray-500 mt-1">
              Are you sure you want to delete this empty bottle return record?
              {record && (
                <span className="block mt-1 text-gray-700">
                  <strong>Quantity:</strong> {record.quantity} bottles
                  <br />
                  <strong>Date:</strong> {record.return_date ? new Date(record.return_date).toLocaleDateString() : 'N/A'}
                  <br />
                  <strong>Source:</strong> {record.source === 'delivery' ? 'Delivery' : 'Manual'}
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
          >
            Delete Record
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Main Component
export default function EmptyBottles({ onRefresh, loading: parentLoading }) {
  const [emptyBottleData, setEmptyBottleData] = useState(null);
  const [returns, setReturns] = useState([]);
  const [aggregateData, setAggregateData] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, record: null });

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch stock
      const stockRes = await inventoryAPI.getEmptyBottles();
      setEmptyBottleData(stockRes.data.emptyBottles);

      // Fetch returns (combined)
      const returnsRes = await inventoryAPI.getEmptyBottleHistory();
      setReturns(returnsRes.data.returns || []);

      // Fetch aggregate
      const aggRes = await inventoryAPI.getEmptyBottleDailyAggregate(30);
      setAggregateData(aggRes.data.aggregate || []);

      // Fetch completed deliveries
      const deliveriesRes = await inventoryAPI.getCompletedDeliveries();
      setDeliveries(deliveriesRes.data.deliveries || []);

    } catch (error) {
      console.error('Failed to fetch empty bottle data:', error);
      toast.error('Failed to load empty bottle data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData();
    if (onRefresh) onRefresh();
  };

  const handleAddBottles = async (data) => {
    try {
      if (data.type === 'delivery') {
        await inventoryAPI.recordEmptyBottleReturn({
          delivery_id: data.delivery_id,
          quantity: data.quantity,
          notes: data.notes
        });
        toast.success('Empty bottles recorded from delivery!');
      } else {
        await inventoryAPI.recordManualEmptyBottleReturn({
          quantity: data.quantity,
          return_date: data.return_date,
          notes: data.notes
        });
        toast.success('Empty bottles added manually!');
      }
      setModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add bottles');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.record) return;
    try {
      await inventoryAPI.deleteEmptyBottleReturn(deleteModal.record.id);
      toast.success('Record deleted successfully!');
      setDeleteModal({ isOpen: false, record: null });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete record');
    }
  };

  if (isLoading || parentLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading empty bottle data...</p>
        </div>
      </div>
    );
  }

  const totalReturns = returns.reduce((sum, r) => sum + (r.quantity || 0), 0);
  const deliveryCount = returns.filter(r => r.source === 'delivery').length;
  const manualCount = returns.filter(r => r.source === 'manual').length;

  return (
    <>
      <AddEmptyBottleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleAddBottles}
        deliveries={deliveries}
      />

      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, record: null })}
        onConfirm={handleDelete}
        record={deleteModal.record}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">19L Empty Bottle Tracking</h2>
            <p className="text-sm text-gray-500">Track empty bottles returned from deliveries</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Add Bottles
            </motion.button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <FlaskConical size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Available Empty Bottles</p>
                <p className="text-2xl font-bold text-gray-900">{emptyBottleData?.stock || 0}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                emptyBottleData?.status === 'low' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
              }`}>
                {emptyBottleData?.status === 'low' ? '⚠️ Low Stock' : '✅ Sufficient'}
              </span>
            </div>
            <div className="flex gap-2 mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                📦 {emptyBottleData?.from_deliveries || 0} from deliveries
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
                ✏️ {emptyBottleData?.from_manual || 0} manual
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Calendar size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Total Returns</p>
                <p className="text-2xl font-bold text-gray-900">{returns.length}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{totalReturns} bottles total</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <Truck size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">From Deliveries</p>
                <p className="text-2xl font-bold text-gray-900">{deliveryCount}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Records from deliveries</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <TrendingUp size={18} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Manual Entries</p>
                <p className="text-2xl font-bold text-gray-900">{manualCount}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Manual records</p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Daily Collection</h3>
              <p className="text-xs text-gray-400 mt-0.5">19L bottles collected per day (Last 30 days)</p>
            </div>
          </div>
          {aggregateData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={aggregateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(value) => [`${value} bottles`, 'Collected']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Bar dataKey="bottles_collected" name="Empty Bottles Returned" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <FlaskConical size={32} className="mx-auto mb-2 text-gray-300" />
              <p>No collection data available</p>
            </div>
          )}
        </div>

        {/* Returns Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">Return History</h3>
            <p className="text-xs text-gray-400 mt-0.5">All empty bottle return records (from deliveries & manual)</p>
          </div>

          <div className="overflow-x-auto">
            {returns.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.map((record) => (
                    <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 text-gray-700">
                        {record.return_date ? new Date(record.return_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">{record.quantity}</td>
                      <td className="py-3 px-4">
                        {record.source === 'delivery' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                            <Truck size={12} />
                            Delivery #{record.delivery_id || record.id?.replace('delivery_', '')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
                            ✏️ Manual
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{record.notes || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, record })}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center">
                <FlaskConical size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 font-medium">No empty bottle returns recorded</p>
                <p className="text-xs text-gray-400 mt-1">
                  Add bottles from completed deliveries or manually
                </p>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setModalOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors shadow-sm"
                >
                  <Plus size={16} />
                  Add First Bottles
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}