import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 p-3 text-sm">
        <p className="font-semibold text-gray-900">{payload[0].name}</p>
        <p style={{ color: payload[0].payload.color }}>LKR {payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export default function ExpenseChart({ data, title, subtitle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
    >
      {(title || subtitle) && (
        <div className="mb-6">
          {title && <h3 className="text-base font-semibold text-gray-900">{title}</h3>}
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="flex items-center gap-6 flex-wrap">
        <ResponsiveContainer width={200} height={200}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-3">
          {data.map((seg, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-gray-600">{seg.name}</span>
              <span className="font-semibold text-gray-900 ml-auto">LKR {seg.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
