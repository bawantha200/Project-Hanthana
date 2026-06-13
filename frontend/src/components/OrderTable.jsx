import StatusBadge from './StatusBadge';
import { formatCurrency } from '../utils/helpers';

export default function OrderTable({ orders, compact = false }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Order ID</th>
            {!compact && <th className="text-left py-3 px-4 font-semibold text-gray-600">Customer</th>}
            {/* {!compact && <th className="text-left py-3 px-4 font-semibold text-gray-600">Branch</th>} */}
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Product</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Qty</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Amount</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
              <td className="py-3 px-4 font-medium text-gray-900">{order.id}</td>
              {!compact && <td className="py-3 px-4 text-gray-600">{order.customer}</td>}
              {/* {!compact && <td className="py-3 px-4 text-gray-500 text-xs">{order.branch}</td>} */}
              <td className="py-3 px-4 text-gray-600">{order.product}</td>
              <td className="py-3 px-4 text-gray-600">{order.qty}</td>
              <td className="py-3 px-4 font-medium text-gray-900">{formatCurrency(order.amount)}</td>
              <td className="py-3 px-4"><StatusBadge status={order.status} /></td>
              <td className="py-3 px-4 text-gray-500">{order.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
