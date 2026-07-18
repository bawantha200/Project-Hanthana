import StatusBadge from './StatusBadge';
import { formatCurrency } from '../utils/helpers';
import { AlertTriangle } from 'lucide-react';

export default function InventoryTable({ data, showPredicted = true }) {
  // If no data, show empty state
  if (!data || data.length === 0) {
    return <div className="p-4 text-center text-gray-400">No inventory items</div>;
  }

  // Check if price column should be shown (based on first item having unit_price)
  const showPrice = data[0]?.unit_price !== undefined;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Product</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Type</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Available Stock</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
            {showPrice && <th className="text-left py-3 px-4 font-semibold text-gray-600">Price</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => {
            // deficit = predicted - stock (only if showPredicted is true)
            const deficit = showPredicted ? (item.predicted || 0) - (item.stock || 0) : 0;
            const isLow = item.status === 'low';
            
            // Normalize type for display
            const displayType = item.type?.toLowerCase() === 'sealed' ? 'Sealed' : 'Refill';
            const typeClass = item.type?.toLowerCase() === 'sealed' ? 'bg-blue-50 text-blue-700' : 'bg-cyan-50 text-cyan-700';

            return (
              <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="py-3 px-4 font-medium text-gray-900">{item.name}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeClass}`}>
                    {displayType}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-700 font-medium">{item.stock.toLocaleString()}</td>
                <td className="py-3 px-4">
                  {isLow ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700">
                      <AlertTriangle size={10} />
                      {deficit > 0 ? `${deficit} short` : 'Low stock'}
                    </span>
                  ) : (
                    <StatusBadge status="ok" />
                  )}
                </td>
                {showPrice && (
                  <td className="py-3 px-4 text-gray-700">
                    {formatCurrency(item.unit_price)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}