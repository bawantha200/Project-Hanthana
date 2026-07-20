// frontend/src/pages/admin/Orders.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Clock,
  Package,
  CheckCircle,
  Search,
  Filter,
  Computer,
  HandHelping,
  Plus,
  Trash2,
  Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchOrders, fetchUsers, fetchProducts, createOrder } from '../../services/ordersService';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

// Animation variants
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

// Filter tabs for order status (matches DB enum)
const filterTabs = [
  { key: 'All', label: 'All', icon: Filter },
  { key: 'PLACED', label: 'Pending', icon: Clock },
  { key: 'PROCESSING', label: 'Processing', icon: Package },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
];

// Filter tabs for order type
const filterTabsMain = [
  { key: 'All', label: 'All', icon: Filter },
  { key: 'HOME_DELIVERY', label: 'Online', icon: Computer },
  { key: 'PICKUP', label: 'Physical', icon: HandHelping },
];

// Summary cards
const summaryCards = [
  {
    key: 'total',
    label: 'Total Orders',
    icon: ShoppingCart,
    color: 'blue',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-600',
  },
  {
    key: 'placed',
    label: 'Pending',
    icon: Clock,
    color: 'amber',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-600',
  },
  {
    key: 'processing',
    label: 'Processing',
    icon: Package,
    color: 'cyan',
    bgClass: 'bg-cyan-50',
    textClass: 'text-cyan-600',
  },
  {
    key: 'delivered',
    label: 'Delivered',
    icon: CheckCircle,
    color: 'emerald',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-600',
  },
];

export default function Orders() {
  const navigate = useNavigate();
  // ---------- State ----------
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatusFilter, setActiveStatusFilter] = useState('All');
  const [activeTypeFilter, setActiveTypeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    customerId: '',
    orderType: 'HOME_DELIVERY',
    paymentMethod: 'CASH',
    deliveryLocation: '',
    items: [],
  });
  const [formLoading, setFormLoading] = useState(false);

  // ---------- Data fetching ----------
  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersData, usersData, productsData] = await Promise.all([
        fetchOrders(),
        fetchUsers(),
        fetchProducts(),
      ]);
      console.log('📦 Raw ordersData:', ordersData);
      console.log('📦 Number of orders:', ordersData?.length);
      if (ordersData && ordersData.length > 0) {
        console.log('📦 First order keys:', Object.keys(ordersData[0]));
        console.log('📦 First order sample:', ordersData[0]);
      } else {
        console.warn('⚠️ No orders returned or ordersData is null/undefined');
      }
      setOrders(ordersData || []);
      setUsers(usersData || []);
      setProducts(productsData || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ---------- Computed summary ----------
  const totalOrders = orders.length;
  const placedOrders = orders.filter((o) => o.order_status === 'PLACED').length;
  const processingOrders = orders.filter((o) => o.order_status === 'PROCESSING').length;
  const deliveredOrders = orders.filter((o) => o.order_status === 'DELIVERED').length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);

  const summaryValues = {
    total: totalOrders,
    placed: placedOrders,
    processing: processingOrders,
    delivered: deliveredOrders,
  };

  // ---------- Filtering ----------
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = activeStatusFilter === 'All' || order.order_status === activeStatusFilter;
    const matchesType = activeTypeFilter === 'All' || order.order_type === activeTypeFilter;
    const matchesSearch =
      order.id.toString().includes(searchQuery) ||
      (order.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.items?.some((item) =>
        item.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
      ) ?? false);
    return matchesStatus && matchesType && matchesSearch;
  });

  // ---------- Form handlers ----------
  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { productId: products[0]?.id || 0, quantity: 1 }],
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerId || formData.items.length === 0) {
      toast.error('Please select a customer and add at least one product.');
      return;
    }
    try {
      setFormLoading(true);
      await createOrder({
        customerId: formData.customerId,
        orderType: formData.orderType,
        paymentMethod: formData.paymentMethod,
        deliveryLocation: formData.deliveryLocation,
        items: formData.items,
      });
      toast.success('Order created successfully');
      await loadData(); // refresh orders
      setShowCreateForm(false);
      setFormData({
        customerId: '',
        orderType: 'HOME_DELIVERY',
        paymentMethod: 'CASH',
        deliveryLocation: '',
        items: [],
      });
    } catch (err) {
      console.error('Failed to create order:', err);
      toast.error('Error creating order. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  // ---------- Render ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage all customer orders</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Customer Order
        </motion.button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.key}
              variants={itemVariants}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl ${card.bgClass} flex items-center justify-center`}
                >
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
        {/* Type filters */}
        <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
          {filterTabsMain.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTypeFilter(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTypeFilter === tab.key
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

        {/* Status filters */}
        <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveStatusFilter(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeStatusFilter === tab.key
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

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all w-56 bg-white"
          />
        </div>
      </motion.div>

      {/* Create Order Modal */}
      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-white rounded-2xl shadow-sm border border-blue-200 p-6 ring-2 ring-blue-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Customer Order</h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Customer */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
                <select
                  required
                  value={formData.customerId}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, customerId: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                >
                  <option value="">Select customer</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} {user.phone ? `(${user.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Order Type */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Order Type</label>
                <select
                  value={formData.orderType}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, orderType: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                >
                  <option value="HOME_DELIVERY">Home Delivery</option>
                  <option value="PICKUP">Pickup</option>
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, paymentMethod: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                >
                  <option value="CASH">Cash</option>
                  <option value="ONLINE">Online</option>
                </select>
              </div>

              {/* Delivery Location (only for HOME_DELIVERY) */}
              {formData.orderType === 'HOME_DELIVERY' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Delivery Location
                  </label>
                  <input
                    type="text"
                    placeholder="Address"
                    value={formData.deliveryLocation}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, deliveryLocation: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  />
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-gray-600">Products</label>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>
              <div className="space-y-2 mt-1">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={item.productId}
                      onChange={(e) =>
                        handleItemChange(index, 'productId', Number(e.target.value))
                      }
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({formatCurrency(p.unit_price)})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, 'quantity', Number(e.target.value))
                      }
                      className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {formData.items.length === 0 && (
                  <p className="text-xs text-gray-400">No products added yet.</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                type="reset"
                onClick={() =>
                  setFormData({
                    customerId: '',
                    orderType: 'HOME_DELIVERY',
                    paymentMethod: 'CASH',
                    deliveryLocation: '',
                    items: [],
                  })
                }
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
              >
                Clear
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={formLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {formLoading ? 'Placing...' : 'Place Order'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Orders Table */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {activeStatusFilter === 'All' ? 'All Orders' : `${activeStatusFilter} Orders`}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <div className="text-xs text-gray-500">
            Total Revenue:{' '}
            <span className="font-semibold text-gray-900">{formatCurrency(totalRevenue)}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3">Order ID</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Items</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900">#{order.id}</td>
                  <td className="px-6 py-3">
                    <div className="font-medium text-gray-800">{order.customer_name || 'N/A'}</div>
                    <div className="text-xs text-gray-400">{order.customer_phone || ''}</div>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        order.order_type === 'HOME_DELIVERY'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {order.order_type === 'HOME_DELIVERY' ? 'Online' : 'Pickup'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        order.order_status === 'PLACED'
                          ? 'bg-amber-100 text-amber-700'
                          : order.order_status === 'PROCESSING'
                          ? 'bg-cyan-100 text-cyan-700'
                          : order.order_status === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {order.order_status === 'PLACED'
                        ? 'Pending'
                        : order.order_status === 'PROCESSING'
                        ? 'Processing'
                        : order.order_status === 'DELIVERED'
                        ? 'Delivered'
                        : 'Cancelled'}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-semibold">{formatCurrency(order.total_amount)}</td>
                  <td className="px-6 py-3 text-gray-600">
                    {order.items?.map((item) => `${item.quantity}x ${item.product_name}`).join(', ')}
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => navigate(`/admin/orders/${order.id}`)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Eye size={14} />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-sm text-gray-400">
            <ShoppingCart size={36} className="mb-3 text-gray-300" />
            <p className="font-medium">No orders found</p>
            <p className="text-xs mt-1">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}