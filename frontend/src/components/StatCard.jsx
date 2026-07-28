import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const COLOR_MAP = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600' },
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'blue',
  delay = 0,
}) {
  const palette = COLOR_MAP[color] || COLOR_MAP.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="h-full flex flex-col justify-between gap-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow duration-200 min-h-[128px]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`w-9 h-9 shrink-0 rounded-xl ${palette.bg} flex items-center justify-center`}>
          {Icon && <Icon size={18} className={palette.text} />}
        </div>
        {trend && trendValue && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
              trend === 'up' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {trend === 'up' ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {trendValue}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight break-words">
          {value}
        </p>
        <p className="text-xs sm:text-sm font-medium text-gray-500 mt-1 truncate">{title}</p>
        {subtitle && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{subtitle}</p>}
      </div>
    </motion.div>
  );
}