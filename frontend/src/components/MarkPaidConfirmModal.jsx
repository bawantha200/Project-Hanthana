import { CheckCircle2, X } from 'lucide-react';

export default function MarkPaidConfirmModal({ isOpen, onClose, onConfirm, employeeName }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Mark as paid</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 mb-5">
            Are you sure you want to mark {employeeName ? <strong>{employeeName}</strong> : 'this record'}'s salary as paid?
            This will count it toward this month's expenses immediately.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
              Cancel
            </button>
            <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
              Mark Paid
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}