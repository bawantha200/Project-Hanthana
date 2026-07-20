import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function VoidConfirmationModal({ isOpen, onClose, onConfirm, expenseId }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError('Please provide a reason for voiding this expense');
      return;
    }
    onConfirm(expenseId, reason.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
              <AlertTriangle size={16} className="text-rose-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Void expense</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            This expense will be marked as voided and excluded from totals. This action keeps
            a record but cannot be undone from this screen.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Reason</label>
            <textarea
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Entered by mistake, duplicate entry"
            />
            {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700"
            >
              Void expense
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}