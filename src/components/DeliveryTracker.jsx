import { motion } from 'framer-motion';
import { CheckCircle2, Clock, MapPin, Truck } from 'lucide-react';

const steps = [
  { key: 'Preparing', label: 'Preparing', icon: Clock },
  { key: 'Dispatched', label: 'Dispatched', icon: Truck },
  { key: 'On Route', label: 'On Route', icon: MapPin },
  { key: 'Delivered', label: 'Delivered', icon: CheckCircle2 },
];

export default function DeliveryTracker({ currentStatus }) {
  const currentIndex = steps.findIndex(s => s.key === currentStatus);

  return (
    <div className="flex items-center w-full py-2">
      {steps.map((step, i) => {
        const isCompleted = i <= currentIndex;
        const isCurrent = i === currentIndex;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: isCurrent ? 1.15 : 1 }}
                transition={{ duration: 0.3 }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                } ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}
              >
                <Icon size={18} />
              </motion.div>
              <span className={`text-xs mt-1.5 font-medium whitespace-nowrap ${isCompleted ? 'text-blue-700' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 mt-[-16px]">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: i < currentIndex ? 1 : 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className={`h-full origin-left ${i < currentIndex ? 'bg-blue-600' : 'bg-gray-200'}`}
                  style={{ transformOrigin: 'left' }}
                />
                <div className={`h-full ${i < currentIndex ? 'bg-blue-600' : 'bg-gray-200'}`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
