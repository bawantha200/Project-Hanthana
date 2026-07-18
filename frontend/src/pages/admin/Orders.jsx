// src/pages/Orders.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingCart, Clock, Package, CheckCircle, Search, Filter,
  Computer, HandHelping, Plus, Trash2, User, Phone, Printer, X, ShoppingBag
} from 'lucide-react';
import { fetchOrders, fetchUsers, fetchProducts, createOrder } from '../../services/ordersService';
import { formatCurrency } from '../../utils/helpers';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';


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
  { key: 'PROCESSING', label: 'Preparing', icon: Package },
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
    label: 'Preparing',
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
  const [customerSearch, setCustomerSearch] = useState('');
const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  // POS-specific state
const [orderMode, setOrderMode] = useState('registered'); // 'registered' | 'walkin'
const [walkinName, setWalkinName] = useState('');
const [walkinPhone, setWalkinPhone] = useState('');
const [productSearch, setProductSearch] = useState('');
const [lastOrder, setLastOrder] = useState(null);
const [showReceipt, setShowReceipt] = useState(false);


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
      setOrders(ordersData);
      setUsers(usersData);
      setProducts(productsData);
    } catch (err) {
      console.error('Failed to load data:', err);
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


  const filteredCustomers = users.filter((u) =>
  u.full_name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
  u.phone?.includes(customerSearch)
);

const selectedCustomer = users.find((u) => u.id === Number(formData.customerId));

  const cartItems = formData.items.map((item) => {
  const product = products.find((p) => p.id === item.productId);
  return {
    ...item,
    name: product?.name || 'Unknown',
    price: product?.unit_price || 0,
    subtotal: (product?.unit_price || 0) * item.quantity,
  };
});

const cartTotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

const filteredProducts = products.filter((p) =>
  p.name.toLowerCase().includes(productSearch.toLowerCase())
);


const handleAddItemFromSearch = (productId) => {
  const existing = formData.items.find((i) => i.productId === productId);
  if (existing) {
    handleItemChange(
      formData.items.findIndex((i) => i.productId === productId),
      'quantity',
      existing.quantity + 1
    );
  } else {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { productId, quantity: 1 }],
    }));
  }
  setProductSearch('');
};


const handleSubmit = async (e) => {
  e.preventDefault();

  if (orderMode === 'registered' && !formData.customerId) {
    alert('Please select a customer.');
    return;
  }
  if (orderMode === 'walkin' && !walkinName.trim()) {
    alert('Please enter the walk-in customer name.');
    return;
  }
  if (formData.items.length === 0) {
    alert('Please add at least one product.');
    return;
  }

  try {
    setFormLoading(true);

    const payload = {
      orderType: formData.orderType,
      paymentMethod: formData.paymentMethod,
      deliveryLocation: formData.deliveryLocation,
      items: formData.items,
      ...(orderMode === 'registered'
        ? { customerId: formData.customerId }
        : { customerName: walkinName, customerPhone: walkinPhone, customerId: null }),
    };

    const createdOrder = await createOrder(payload);

    // Build receipt snapshot before clearing the form
    setLastOrder({
      id: createdOrder?.id || createdOrder?.data?.id || Date.now(),
      customerName:
        orderMode === 'registered'
          ? users.find((u) => u.id === Number(formData.customerId))?.full_name
          : walkinName,
      customerPhone:
        orderMode === 'registered'
          ? users.find((u) => u.id === Number(formData.customerId))?.phone
          : walkinPhone,
      orderType: formData.orderType,
      paymentMethod: formData.paymentMethod,
      items: cartItems,
      total: cartTotal,
      date: new Date(),
    });

    await loadData();
    setShowCreateForm(false);
    setShowReceipt(true);
    setFormData({
      customerId: '',
      orderType: 'HOME_DELIVERY',
      paymentMethod: 'CASH',
      deliveryLocation: '',
      items: [],
    });
    setWalkinName('');
    setWalkinPhone('');
    setOrderMode('registered');
  } catch (err) {
    console.error('Failed to create order:', err);
    alert('Error creating order. Please try again.');
  } finally {
    setFormLoading(false);
  }
};

const handlePrintReceipt = () => {
  window.print();
};

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

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   if (!formData.customerId || formData.items.length === 0) {
  //     alert('Please select a customer and add at least one product.');
  //     return;
  //   }
  //   try {
  //     setFormLoading(true);
  //     await createOrder({
  //       customerId: formData.customerId,
  //       orderType: formData.orderType,
  //       paymentMethod: formData.paymentMethod,
  //       deliveryLocation: formData.deliveryLocation,
  //       items: formData.items,
  //     });
  //     await loadData(); // refresh orders
  //     setShowCreateForm(false);
  //     setFormData({
  //       customerId: '',
  //       orderType: 'HOME_DELIVERY',
  //       paymentMethod: 'CASH',
  //       deliveryLocation: '',
  //       items: [],
  //     });
  //   } catch (err) {
  //     console.error('Failed to create order:', err);
  //     alert('Error creating order. Please try again.');
  //   } finally {
  //     setFormLoading(false);
  //   }
  // };

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
          onClick={() => navigate('/admin/pos')}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
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
      {/* ===== POS ORDER MODAL ===== */}
{showCreateForm && (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="bg-white rounded-2xl shadow-sm border border-blue-200 p-6 ring-2 ring-blue-100"
  >
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
          <ShoppingBag size={18} className="text-blue-600" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">New Order (POS)</h2>
      </div>
      <button
        onClick={() => setShowCreateForm(false)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X size={18} />
      </button>
    </div>

    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* LEFT: Customer + Product search */}
      <div className="lg:col-span-3 space-y-5">
        {/* Customer mode toggle */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Customer</label>
          <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-100 w-fit mb-3">
            <button
              type="button"
              onClick={() => setOrderMode('registered')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                orderMode === 'registered'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <User size={13} /> Registered
            </button>
            <button
              type="button"
              onClick={() => setOrderMode('walkin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                orderMode === 'walkin'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Phone size={13} /> Walk-in
            </button>
          </div>

          {orderMode === 'registered' ? (
            
  <div className="relative">
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        placeholder="Search customer by name or phone..."
        value={selectedCustomer ? `${selectedCustomer.full_name} (${selectedCustomer.phone || ''})` : customerSearch}
        onChange={(e) => {
          setCustomerSearch(e.target.value);
          setFormData((prev) => ({ ...prev, customerId: '' }));
          setShowCustomerDropdown(true);
        }}
        onFocus={() => setShowCustomerDropdown(true)}
        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
      />
      {selectedCustomer && (
        <button
          type="button"
          onClick={() => {
            setFormData((prev) => ({ ...prev, customerId: '' }));
            setCustomerSearch('');
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X size={14} />
        </button>
      )}
    </div>

    {showCustomerDropdown && customerSearch && !selectedCustomer && (
  <div className="absolute z-10 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-lg max-h-56 overflow-y-auto py-1.5">
    {filteredCustomers.length === 0 && (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <User size={20} className="text-gray-300 mb-1.5" />
        <p className="text-xs text-gray-400">No customers found</p>
      </div>
    )}
    {filteredCustomers.map((user) => (
      <button
        type="button"
        key={user.id}
        onClick={() => {
          setFormData((prev) => ({ ...prev, customerId: user.id }));
          setCustomerSearch('');
          setShowCustomerDropdown(false);
        }}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 transition-colors text-left"
      >
        {/* Avatar circle with initials */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
          {user.name
            ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
            : '?'}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user.name || 'Unnamed Customer'}
          </p>
          <p className="text-xs text-gray-400">{user.phone || 'No phone'}</p>
        </div>
      </button>
    ))}
  </div>
)}
  </div>


          ) : (
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Customer name"
                value={walkinName}
                onChange={(e) => setWalkinName(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
              <input
                type="text"
                placeholder="Phone (optional)"
                value={walkinPhone}
                onChange={(e) => setWalkinPhone(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
          )}
        </div>

        {/* Order type + Payment */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Order Type</label>
            <select
              value={formData.orderType}
              onChange={(e) => setFormData((prev) => ({ ...prev, orderType: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
            >
              <option value="HOME_DELIVERY">Home Delivery</option>
              <option value="PICKUP">Pickup</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData((prev) => ({ ...prev, paymentMethod: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
            >
              <option value="CASH">Cash</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>
        </div>

        {formData.orderType === 'HOME_DELIVERY' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Delivery Location</label>
            <input
              type="text"
              placeholder="Address"
              value={formData.deliveryLocation}
              onChange={(e) => setFormData((prev) => ({ ...prev, deliveryLocation: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>
        )}

        {/* Searchable product list */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Add Products</label>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search product..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>
          <div className="border border-gray-100 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-50">
            {filteredProducts.length === 0 && (
              <p className="text-xs text-gray-400 p-3">No matching products</p>
            )}
            {filteredProducts.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => handleAddItemFromSearch(p.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-blue-50 transition-colors text-left"
              >
                <span className="text-gray-800">{p.name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{formatCurrency(p.unit_price)}</span>
                  <Plus size={14} className="text-blue-600" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: Cart summary */}
      <div className="lg:col-span-2">
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 h-full flex flex-col">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Cart</h3>

          <div className="flex-1 space-y-2 overflow-y-auto max-h-64">
            {cartItems.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8">No items added yet</p>
            )}
            {cartItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
                  <p className="text-[11px] text-gray-400">{formatCurrency(item.price)} each</p>
                </div>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                  className="w-14 px-1 py-1 text-xs border border-gray-200 rounded-lg text-center mx-2"
                />
                <p className="text-xs font-semibold text-gray-900 w-16 text-right">
                  {formatCurrency(item.subtotal)}
                </p>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="text-red-400 hover:text-red-600 p-1 ml-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 mt-3 pt-3">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-700">Total</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(cartTotal)}</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={formLoading || cartItems.length === 0}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {formLoading ? 'Placing Order...' : 'Place Order'}
            </motion.button>
          </div>
        </div>
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
                        ? 'Preparing'
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

      {/* ===== RECEIPT MODAL ===== */}
{showReceipt && lastOrder && (
  <>
    <style>{`
      @media print {
        body * { visibility: hidden; }
        #receipt-print-area, #receipt-print-area * { visibility: visible; }
        #receipt-print-area {
          position: absolute; top: 0; left: 0; width: 100%;
          padding: 20px;
        }
      }
    `}</style>

    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 print:hidden-parent">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
      >
        <div id="receipt-print-area">
          <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
            <h2 className="text-lg font-bold text-gray-900">Hanthana Water</h2>
            <p className="text-xs text-gray-500">Order Receipt</p>
            <p className="text-xs text-gray-400 mt-1">
              {lastOrder.date.toLocaleString()}
            </p>
          </div>

          <div className="text-xs text-gray-600 space-y-1 mb-4">
            <p><span className="font-medium">Order ID:</span> #{lastOrder.id}</p>
            <p><span className="font-medium">Customer:</span> {lastOrder.customerName || 'Walk-in'}</p>
            {lastOrder.customerPhone && <p><span className="font-medium">Phone:</span> {lastOrder.customerPhone}</p>}
            <p><span className="font-medium">Type:</span> {lastOrder.orderType === 'HOME_DELIVERY' ? 'Home Delivery' : 'Pickup'}</p>
            <p><span className="font-medium">Payment:</span> {lastOrder.paymentMethod}</p>
          </div>

          <div className="border-t border-dashed border-gray-300 pt-3 space-y-2">
            {lastOrder.items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-gray-700">{item.quantity}x {item.name}</span>
                <span className="text-gray-900 font-medium">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-300 mt-3 pt-3 flex justify-between">
            <span className="text-sm font-bold text-gray-900">Total</span>
            <span className="text-sm font-bold text-gray-900">{formatCurrency(lastOrder.total)}</span>
          </div>

          <p className="text-center text-[11px] text-gray-400 mt-5">Thank you for your order!</p>
        </div>

        {/* Buttons - hidden during print */}
        <div className="flex items-center gap-3 mt-5 print:hidden">
          <button
            onClick={() => setShowReceipt(false)}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrintReceipt}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Printer size={15} /> Print
          </button>
        </div>
      </motion.div>
    </div>
  </>
)}
    </motion.div>
  );
}