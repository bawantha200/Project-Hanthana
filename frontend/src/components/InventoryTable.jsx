import StatusBadge from './StatusBadge';
import { formatCurrency } from '../utils/helpers';
import { AlertTriangle } from 'lucide-react';

export default function InventoryTable({ data, showPredicted = true }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Product</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Type</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Available Stock</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
            {data[0]?.price !== undefined && <th className="text-left py-3 px-4 font-semibold text-gray-600">Price</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => {
            const deficit = showPredicted ? item.predicted - item.stock : 0;
            const isLow = item.status === 'low';
            return (
              <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="py-3 px-4 font-medium text-gray-900">{item.product}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.type === 'sealed' ? 'bg-blue-50 text-blue-700' : 'bg-cyan-50 text-cyan-700'}`}>
                    {item.type}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-700 font-medium">{item.stock.toLocaleString()}</td>
                <td className="py-3 px-4">
                  {isLow ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700">
                      <AlertTriangle size={10} />
                      {deficit} short
                    </span>
                  ) : (
                    <StatusBadge status="ok" />
                  )}
                </td>
                {item.price !== undefined && <td className="py-3 px-4 text-gray-700">{formatCurrency(item.price)}/{item.unit}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
