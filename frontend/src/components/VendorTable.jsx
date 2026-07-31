// components/VendorTable.jsx
import { Edit, Trash2 } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function VendorTable({ vendors, onEdit, onDelete, onRowClick }) {
  if (!vendors || vendors.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-gray-500 font-medium">No vendors found</p>
        <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor Company</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Supply Type</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((vendor) => (
            <tr 
              key={vendor.id} 
              className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
              onClick={() => onRowClick && onRowClick(vendor)}
            >
              <td className="py-3 px-4 font-medium text-gray-900">{vendor.name}</td>
              <td className="py-3 px-4 text-gray-600">{vendor.contact || '—'}</td>
              <td className="py-3 px-4 text-gray-600">{vendor.phone || '—'}</td>
              <td className="py-3 px-4">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                  {vendor.supplyType || 'Not specified'}
                </span>
              </td>
              <td className="py-3 px-4">
                <StatusBadge status={vendor.status} />
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(vendor);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Edit Vendor"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(vendor);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete Vendor"
                  >
                    <Trash2 size={16} />
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