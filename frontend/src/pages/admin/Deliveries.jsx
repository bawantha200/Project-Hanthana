import { useState } from 'react';
import { motion } from 'framer-motion';
import { Truck, MapPin, Navigation, User, Clock, CheckCircle2, Search, Filter } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import DeliveryTracker from '../../components/DeliveryTracker';
import { deliveryData } from '../../data/mockData';
import { formatCurrency } from '../../utils/helpers';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const filterTabs = [
  { key: 'All', label: 'All', icon: Filter },
  { key: 'Preparing', label: 'Preparing', icon: Clock },
  { key: 'Dispatched', label: 'Dispatched', icon: Truck },
  { key: 'On Route', label: 'On Route', icon: Navigation },
  { key: 'Delivered', label: 'Delivered', icon: CheckCircle2 },
];

const summaryCards = [
  {
    key: 'total',
    label: 'Total Deliveries',
    icon: Truck,
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-600',
  },
  {
    key: 'onRoute',
    label: 'On Route',
    icon: Navigation,
    bgClass: 'bg-indigo-50',
    textClass: 'text-indigo-600',
  },
  {
    key: 'dispatched',
    label: 'Dispatched',
    icon: Truck,
    bgClass: 'bg-cyan-50',
    textClass: 'text-cyan-600',
  },
  {
    key: 'delivered',
    label: 'Delivered',
    icon: CheckCircle2,
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-600',
  },
];

export default function Deliveries() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  const totalDeliveries = deliveryData.length;
  const onRouteDeliveries = deliveryData.filter((d) => d.status === 'On Route').length;
  const dispatchedDeliveries = deliveryData.filter((d) => d.status === 'Dispatched').length;
  const deliveredDeliveries = deliveryData.filter((d) => d.status === 'Delivered').length;

  const summaryValues = {
    total: totalDeliveries,
    onRoute: onRouteDeliveries,
    dispatched: dispatchedDeliveries,
    delivered: deliveredDeliveries,
  };

  const filteredDeliveries = deliveryData.filter((delivery) => {
    const matchesStatus = activeFilter === 'All' || delivery.status === activeFilter;
    const matchesSearch =
      delivery.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.driver.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.currentLocation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Group drivers and their assignments
  const driverAssignments = deliveryData.reduce((acc, delivery) => {
    if (!acc[delivery.driver]) {
      acc[delivery.driver] = [];
    }
    acc[delivery.driver].push(delivery);
    return acc;
  }, {});

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Deliveries Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track delivery routes, assign drivers, and monitor shipment status
        </p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.key}
              variants={itemVariants}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${card.bgClass} flex items-center justify-center`}>
                  <Icon size={18} className={card.textClass} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">{card.label}</p>
                  <p className="text-xl font-bold text-gray-900">{summaryValues[card.key]}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Filter Tabs & Search */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between gap-4 flex-wrap"
      >
        <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeFilter === tab.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search deliveries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all w-56 bg-white"
          />
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Delivery Route Tracking Table */}
        <motion.div
          variants={itemVariants}
          className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
        >
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              {activeFilter === 'All' ? 'All Deliveries' : `${activeFilter} Deliveries`}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {filteredDeliveries.length} delivery{filteredDeliveries.length !== 1 ? 'ies' : 'y'} found
            </p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivery ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Driver</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicle</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ETA</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDeliveries.map((delivery, index) => (
                  <motion.tr
                    key={delivery.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.04 }}
                    onClick={() => setSelectedDelivery(selectedDelivery?.id === delivery.id ? null : delivery)}
                    className={`cursor-pointer transition-colors duration-150 ${
                      selectedDelivery?.id === delivery.id
                        ? 'bg-blue-50/50'
                        : 'hover:bg-gray-50/80'
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-blue-600">{delivery.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{delivery.orderId}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                          <User size={14} className="text-blue-600" />
                        </div>
                        <span className="text-sm text-gray-700">{delivery.driver}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Truck size={14} className="text-gray-400" />
                        <span className="truncate max-w-[120px]">{delivery.vehicle}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={delivery.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600 truncate max-w-[140px]">{delivery.currentLocation}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-gray-400" />
                        <span className={`text-sm font-medium ${
                          delivery.eta === 'Delivered' ? 'text-emerald-600' : 'text-gray-700'
                        }`}>
                          {delivery.eta}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{delivery.customer}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredDeliveries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-gray-400">
              <Truck size={36} className="mb-3 text-gray-300" />
              <p className="font-medium">No deliveries found</p>
              <p className="text-xs mt-1">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </motion.div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* GPS Location Placeholder */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">GPS Tracking</h2>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </div>
            </div>
            <div
              className="relative w-full h-48 rounded-xl overflow-hidden"
              style={{
                backgroundColor: '#e8f0fe',
                backgroundImage:
                  'linear-gradient(rgba(37, 99, 235, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(37, 99, 235, 0.08) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            >
              {/* Grid overlay lines */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute w-full h-px bg-blue-200/60" />
                <div className="absolute h-full w-px bg-blue-200/60" />
              </div>
              {/* Map pin icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative"
                >
                  <MapPin size={32} className="text-blue-600 drop-shadow-md" fill="#2563EB" />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-blue-600/20 rounded-full blur-sm" />
                </motion.div>
              </div>
              {/* Location labels */}
              <div className="absolute top-3 left-3 text-[10px] font-medium text-blue-400 bg-white/80 px-2 py-0.5 rounded-md">
                N
              </div>
              <div className="absolute bottom-3 right-3 text-[10px] text-blue-400 bg-white/80 px-2 py-0.5 rounded-md">
                {selectedDelivery ? selectedDelivery.currentLocation : 'Select a delivery'}
              </div>
              {/* Active delivery markers */}
              {deliveryData
                .filter((d) => d.status === 'On Route' || d.status === 'Dispatched')
                .map((d, i) => (
                  <motion.div
                    key={d.id}
                    className="absolute w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm"
                    style={{
                      top: `${25 + i * 20}%`,
                      left: `${20 + i * 25}%`,
                    }}
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                  />
                ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>{deliveryData.filter((d) => d.status === 'On Route').length} vehicles on route</span>
              <span className="text-blue-600 font-medium cursor-pointer hover:underline">View full map</span>
            </div>
          </motion.div>

          {/* Delivery Tracker for Selected Delivery */}
          {selectedDelivery && (
            <motion.div
              variants={itemVariants}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200"
            >
              <h2 className="text-base font-semibold text-gray-900 mb-1">
                Delivery Status
              </h2>
              <p className="text-xs text-gray-400 mb-4">{selectedDelivery.id} - {selectedDelivery.customer}</p>
              <DeliveryTracker currentStatus={selectedDelivery.status} />
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Driver</span>
                  <span className="font-medium text-gray-700">{selectedDelivery.driver}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Vehicle</span>
                  <span className="font-medium text-gray-700">{selectedDelivery.vehicle}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Location</span>
                  <span className="font-medium text-gray-700">{selectedDelivery.currentLocation}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">ETA</span>
                  <span className={`font-medium ${selectedDelivery.eta === 'Delivered' ? 'text-emerald-600' : 'text-gray-700'}`}>
                    {selectedDelivery.eta}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Delivery Confirmation Status */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200"
          >
            <h2 className="text-base font-semibold text-gray-900 mb-4">Delivery Confirmation</h2>
            <div className="space-y-3">
              {deliveryData.map((delivery) => (
                <div
                  key={delivery.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 hover:bg-gray-100/80 transition-colors duration-150"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      delivery.status === 'Delivered'
                        ? 'bg-emerald-100'
                        : delivery.status === 'On Route'
                        ? 'bg-indigo-100'
                        : delivery.status === 'Dispatched'
                        ? 'bg-cyan-100'
                        : 'bg-amber-100'
                    }`}>
                      {delivery.status === 'Delivered' ? (
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      ) : delivery.status === 'On Route' ? (
                        <Navigation size={16} className="text-indigo-600" />
                      ) : delivery.status === 'Dispatched' ? (
                        <Truck size={16} className="text-cyan-600" />
                      ) : (
                        <Clock size={16} className="text-amber-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{delivery.id}</p>
                      <p className="text-xs text-gray-400">{delivery.customer}</p>
                    </div>
                  </div>
                  <StatusBadge status={delivery.status} />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Driver Assignments Section */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
      >
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Driver Assignments</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {Object.keys(driverAssignments).length} drivers with active assignments
          </p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Object.entries(driverAssignments).map(([driver, deliveries], index) => (
            <motion.div
              key={driver}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.06 }}
              className="rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow duration-200"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <User size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{driver}</p>
                  <p className="text-xs text-gray-400">{deliveries.length} assignment{deliveries.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="space-y-2">
                {deliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/80 hover:bg-gray-100/80 transition-colors duration-150"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${
                        delivery.status === 'On Route'
                          ? 'bg-indigo-500'
                          : delivery.status === 'Dispatched'
                          ? 'bg-cyan-500'
                          : delivery.status === 'Delivered'
                          ? 'bg-emerald-500'
                          : 'bg-amber-500'
                      }`} />
                      <div>
                        <p className="text-xs font-medium text-gray-700">{delivery.id}</p>
                        <p className="text-[10px] text-gray-400">{delivery.customer}</p>
                      </div>
                    </div>
                    <StatusBadge status={delivery.status} />
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-400">{deliveries[0]?.vehicle}</span>
                <span className="text-gray-400">{deliveries[0]?.branch}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
