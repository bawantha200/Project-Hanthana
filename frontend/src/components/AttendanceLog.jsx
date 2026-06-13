export default function AttendanceLog({ records }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Employee</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Position</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Date</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Check In</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Check Out</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Working Hours</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">OT Hours</th>
          </tr>
        </thead>
        <tbody>
          {records.map((rec, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
              <td className="py-3 px-4 font-medium text-gray-900">{rec.name}</td>
              <td className="py-3 px-4 text-gray-600">{rec.position}</td>
              <td className="py-3 px-4 text-gray-600">{rec.date}</td>
              <td className="py-3 px-4 text-gray-600">{rec.checkIn}</td>
              <td className="py-3 px-4 text-gray-600">{rec.checkOut}</td>
              <td className="py-3 px-4 text-gray-700">{rec.workingHours}h</td>
              <td className="py-3 px-4">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${rec.otHours > 0.5 ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'}`}>
                  {rec.otHours}h
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
