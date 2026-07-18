// components/VendorTable.jsx
import StatusBadge from './StatusBadge';
import { Edit, Trash2, ShoppingCart } from 'lucide-react';

export default function VendorTable({ vendors, onEdit, onDelete, showOrderActions = false }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Vendor</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Phone</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Supply Type</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Last Delivery</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((v) => (
            <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
              <td className="py-3 px-4 font-medium text-gray-900">{v.vendor_name || v.name}</td>
              <td className="py-3 px-4 text-gray-600">{v.contact_number || v.phone}</td>
              <td className="py-3 px-4">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                  {v.supply_type || v.supplyType}
                </span>
              </td>
              <td className="py-3 px-4 text-gray-500">
                {v.last_delivery || v.lastDelivery ? new Date(v.last_delivery || v.lastDelivery).toLocaleDateString() : 'N/A'}
              </td>
              <td className="py-3 px-4">
                <StatusBadge status={v.isActive !== undefined ? (v.isActive ? 'active' : 'inactive') : v.status} />
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1">
                  {showOrderActions && (
                    <button
                      onClick={() => onEdit?.(v)}
                      className="p-1 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="Place Order"
                    >
                      <ShoppingCart size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => onEdit?.(v)}
                    className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => onDelete?.(v)}
                    className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}