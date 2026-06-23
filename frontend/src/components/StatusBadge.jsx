export default function StatusBadge({ status }) {
  const getStatusConfig = (status) => {
    const statusMap = {
      // Attendance statuses
      present: { label: 'Present', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
      half_day: { label: 'Half Day', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
      absent: { label: 'Absent', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
      
      // Employee statuses
      active: { label: 'Active', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
      on_leave: { label: 'On Leave', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
      inactive: { label: 'Inactive', bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
      
      // Order/Other statuses
      delivered: { label: 'Delivered', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
      pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
      cancelled: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
      shipped: { label: 'Shipped', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
      completed: { label: 'Completed', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
      late: { label: 'Late', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
      leave: { label: 'Leave', bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
    };

    // Check if status exists in map, if not return default
    const config = statusMap[status?.toLowerCase()];
    if (config) return config;

    // Default fallback
    return {
      label: status || 'Unknown',
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      dot: 'bg-gray-400'
    };
  };

  const config = getStatusConfig(status);

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
      {config.label}
    </span>
  );
}