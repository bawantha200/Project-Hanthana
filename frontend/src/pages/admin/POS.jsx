// src/pages/admin/POS.jsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Trash2, User, Phone, Printer, X, ShoppingBag, ArrowLeft,
  Minus, CreditCard, Banknote, Truck, Package, Check,
  Users, ShoppingCart, DollarSign, MapPin,
  ChevronDown, ChevronUp, Grid3x3, List, Image as ImageIcon,
  Mail, Droplet, RefreshCw, Droplets, ShoppingBasket, LayoutGrid
} from 'lucide-react';
import { 
  fetchUsers, 
  fetchProducts, 
  createOrder, 
  completeOrder,
  getWaterPrice,
  createBulkWaterOrder
} from '../../services/ordersService';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

// Image fallback component
const ProductImage = ({ src, alt, className }) => {
  const [imgError, setImgError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!src || imgError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <ImageIcon size={32} className="text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setImgError(true);
          setLoading(false);
        }}
      />
    </div>
  );
};

export default function POS() {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  
  // ---------- Tab State ----------
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'bulk'

  // ---------- Data ----------
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);

  // ---------- Customer ----------
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [orderMode, setOrderMode] = useState('registered');
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');

  // ---------- Cart ----------
  const [formData, setFormData] = useState({
    customerId: '',
    orderType: 'PICKUP',
    paymentMethod: 'CASH',
    deliveryLocation: '',
    items: [],
  });

  // ---------- Product Search ----------
  const [productSearch, setProductSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);

  // ---------- Bulk Water ----------
  const [waterLiters, setWaterLiters] = useState('');
  const [waterPrice, setWaterPrice] = useState(50.00);

  // ---------- Receipt ----------
  const [lastOrder, setLastOrder] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // ---------- Load Data ----------
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [usersData, productsData, price] = await Promise.all([
          fetchUsers(),
          fetchProducts(),
          getWaterPrice()
        ]);
        setUsers(usersData || []);
        setProducts(productsData || []);
        setWaterPrice(price || 50.00);
      } catch (err) {
        console.error('Failed to load data:', err);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // ---------- Focus search on load ----------
  useEffect(() => {
    if (!loading) {
      searchInputRef.current?.focus();
    }
  }, [loading]);

  // ---------- Computed ----------
  const filteredCustomers = (users || []).filter((u) =>
    u.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    u.phone?.includes(customerSearch)
  );

  const selectedCustomer = (users || []).find((u) => u.id === formData.customerId);

  const cartItems = (formData.items || []).map((item) => {
    const product = (products || []).find((p) => p.id === item.productId);
    return {
      ...item,
      name: product?.name || 'Unknown',
      price: product?.unit_price || 0,
      subtotal: (product?.unit_price || 0) * item.quantity,
      image: product?.image_url || null,
      type: product?.type || 'SEALED',
    };
  });

  const cartTotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const waterTotal = (parseFloat(waterLiters) || 0) * waterPrice;

  const filteredProducts = (products || []).filter((p) => {
    const matchesSearch = p.name?.toLowerCase().includes(productSearch.toLowerCase());
    const matchesType = selectedType === 'all' || p.type === selectedType;
    return matchesSearch && matchesType;
  });

  const productTypes = ['all', ...new Set((products || []).map(p => p.type).filter(Boolean))];

  // ---------- Handlers ----------
  const handleAddItem = (productId) => {
    const existing = (formData.items || []).find((i) => i.productId === productId);
    if (existing) {
      handleItemChange(
        formData.items.findIndex((i) => i.productId === productId),
        'quantity',
        existing.quantity + 1
      );
    } else {
      setFormData((prev) => ({
        ...prev,
        items: [...(prev.items || []), { productId, quantity: 1 }],
      }));
    }
    setProductSearch('');
    setShowProductSuggestions(false);
  };

  const handleRemoveItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: (prev.items || []).filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    if (value < 1) return;
    setFormData((prev) => {
      const newItems = [...(prev.items || [])];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const handleQuickAdd = (productId) => {
    const product = (products || []).find(p => p.id === productId);
    if (product) {
      const existing = (formData.items || []).find((i) => i.productId === productId);
      if (existing) {
        handleItemChange(
          formData.items.findIndex((i) => i.productId === productId),
          'quantity',
          existing.quantity + 1
        );
      } else {
        setFormData((prev) => ({
          ...prev,
          items: [...(prev.items || []), { productId, quantity: 1 }],
        }));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      customerId: '',
      orderType: 'PICKUP',
      paymentMethod: 'CASH',
      deliveryLocation: '',
      items: [],
    });
    setWalkinName('');
    setWalkinPhone('');
    setOrderMode('registered');
    setCustomerSearch('');
    setProductSearch('');
    setWaterLiters('');
  };

  // ---------- Submit Product Order ----------
  const handleProductSubmit = async (e) => {
    e.preventDefault();

    if (orderMode === 'registered' && !formData.customerId) {
      toast.error('Please select a customer.');
      return;
    }
    if (orderMode === 'walkin' && !walkinName.trim()) {
      toast.error('Please enter the walk-in customer name.');
      return;
    }
    if ((formData.items || []).length === 0) {
      toast.error('Please add at least one product.');
      return;
    }

    try {
      setFormLoading(true);

      const itemsForOrder = (formData.items || []).map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }));

      const payload = {
        orderType: formData.orderType,
        paymentMethod: formData.paymentMethod,
        deliveryLocation: formData.deliveryLocation,
        items: itemsForOrder,
        ...(orderMode === 'registered'
          ? { customerId: formData.customerId }
          : { customerName: walkinName, customerPhone: walkinPhone, customerId: null }),
      };

      const createdOrder = await createOrder(payload);
      
      toast.success('Order placed successfully!');

      const customerName = orderMode === 'registered'
        ? selectedCustomer?.name || 'Customer'
        : walkinName;
      const customerPhone = orderMode === 'registered'
        ? selectedCustomer?.phone || ''
        : walkinPhone;
      const customerEmail = selectedCustomer?.email || '';
      const customerAddress = selectedCustomer?.address || '';

      setLastOrder({
        id: createdOrder?.id || Date.now(),
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        orderType: formData.orderType,
        paymentMethod: formData.paymentMethod,
        items: cartItems,
        total: cartTotal,
        date: new Date(),
        type: 'product'
      });

      setShowReceipt(true);
      resetForm();
    } catch (err) {
      console.error('Failed to create order:', err);
      toast.error(err.message || 'Error creating order. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  // ---------- Submit Bulk Water Order ----------
  const handleBulkSubmit = async (e) => {
    e.preventDefault();

    const liters = parseFloat(waterLiters);
    if (!liters || liters <= 0) {
      toast.error('Please enter valid liters');
      return;
    }

    if (orderMode === 'registered' && !formData.customerId) {
      toast.error('Please select a customer.');
      return;
    }
    if (orderMode === 'walkin' && !walkinName.trim()) {
      toast.error('Please enter the walk-in customer name.');
      return;
    }

    try {
      setFormLoading(true);
      
      const orderData = {
        customerId: formData.customerId || null,
        customerName: orderMode === 'walkin' ? walkinName : selectedCustomer?.name,
        customerPhone: orderMode === 'walkin' ? walkinPhone : selectedCustomer?.phone,
        liters: liters,
        paymentMethod: formData.paymentMethod
      };
      
      const order = await createBulkWaterOrder(orderData);
      
      const customerName = orderMode === 'registered'
        ? selectedCustomer?.name || 'Customer'
        : walkinName;
      const customerPhone = orderMode === 'registered'
        ? selectedCustomer?.phone || ''
        : walkinPhone;

      setLastOrder({
        id: order.id,
        customerName: customerName || 'Walk-in',
        customerPhone: customerPhone || '',
        items: [{ 
          name: `Water (${liters}L)`, 
          quantity: 1, 
          subtotal: waterTotal,
          price: waterPrice,
          isBulkWater: true 
        }],
        total: waterTotal,
        date: new Date(),
        type: 'bulk',
        paymentMethod: formData.paymentMethod
      });
      
      setShowReceipt(true);
      setWaterLiters('');
      resetForm();
      toast.success('Water order placed successfully!');
    } catch (err) {
      console.error('Failed to create water order:', err);
      toast.error(err.message || 'Error creating water order');
    } finally {
      setFormLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setLastOrder(null);
    navigate('/admin/pos');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowProductSuggestions(false);
      setShowCustomerDropdown(false);
    }
    if (e.key === 'Enter' && activeTab === 'products' && productSearch && filteredProducts.length > 0) {
      handleAddItem(filteredProducts[0].id);
    }
    if (e.key === 'Enter' && activeTab === 'bulk' && waterLiters) {
      handleBulkSubmit(e);
    }
  };

  const getTypeBadge = (type) => {
    switch(type) {
      case 'SEALED':
        return { bg: 'bg-blue-100', text: 'text-blue-700', icon: Droplet };
      case 'REFILL':
        return { bg: 'bg-amber-100', text: 'text-amber-700', icon: RefreshCw };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', icon: Package };
    }
  };

  // ---------- Render ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-500 font-medium">Loading POS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/pos')}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
            >
              <ShoppingCart size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Point of Sale
              </h1>
              <p className="text-xs text-gray-500">New Order • {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Grid3x3 size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List size={16} />
              </button>
            </div>
            <div className="h-6 w-px bg-gray-200"></div>
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl">
              <DollarSign size={16} className="text-blue-600" />
              <span className="text-sm font-semibold text-blue-600">
                {activeTab === 'products' ? formatCurrency(cartTotal) : formatCurrency(waterTotal)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <div className="px-6 py-4 max-w-[1600px] mx-auto">
        <form onSubmit={activeTab === 'products' ? handleProductSubmit : handleBulkSubmit} className="flex gap-6">
          {/* ===== LEFT PANEL ===== */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Tab Selector */}
            <div className="flex items-center gap-2 bg-white rounded-2xl p-1 border-2 border-gray-200 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('products');
                  setProductSearch('');
                  searchInputRef.current?.focus();
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'products'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-600/25'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ShoppingBag size={18} />
                Product Orders
                {cartItemCount > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === 'products' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {cartItemCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('bulk');
                  searchInputRef.current?.focus();
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'bulk'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Droplets size={18} />
                Bulk Water
                {waterLiters && parseFloat(waterLiters) > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === 'bulk' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    {waterLiters}L
                  </span>
                )}
              </button>
            </div>

            {/* ===== PRODUCT TAB CONTENT ===== */}
            {activeTab === 'products' && (
              <>
                {/* Search Bar */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Search size={18} />
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search products by name... (Press Enter to add first result)"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductSuggestions(true);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowProductSuggestions(true)}
                    className="w-full pl-12 pr-4 py-3.5 text-sm bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setProductSearch('');
                        setShowProductSuggestions(false);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Product Types Filter */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {productTypes.map((type) => {
                    const typeBadge = getTypeBadge(type);
                    const TypeIcon = type === 'all' ? Package : typeBadge.icon;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSelectedType(type)}
                        className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                          selectedType === type
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        <TypeIcon size={14} />
                        {type === 'all' ? 'All Products' : type}
                      </button>
                    );
                  })}
                </div>

                {/* Product Grid */}
                <div className={`grid gap-3 ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'}`}>
                  <AnimatePresence mode="wait">
                    {filteredProducts.length === 0 ? (
                      <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                        <Package size={48} className="text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No products found</p>
                        <p className="text-sm text-gray-400">Try adjusting your search</p>
                      </div>
                    ) : (
                      filteredProducts.slice(0, 20).map((product) => {
                        const typeBadge = getTypeBadge(product.type);
                        const TypeIcon = typeBadge.icon;
                        return (
                          <motion.button
                            key={product.id}
                            type="button"
                            onClick={() => handleQuickAdd(product.id)}
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            className={`group relative bg-white rounded-2xl border-2 border-gray-100 hover:border-blue-400 hover:shadow-xl transition-all duration-200 overflow-hidden ${
                              viewMode === 'list' ? 'flex items-center gap-4 p-4' : 'p-4'
                            }`}
                          >
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
                                <Plus size={16} />
                              </div>
                            </div>

                            <div className="absolute top-2 left-2 z-10">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${typeBadge.bg} ${typeBadge.text} flex items-center gap-1`}>
                                <TypeIcon size={10} />
                                {product.type}
                              </span>
                            </div>

                            {viewMode === 'grid' ? (
                              <>
                                <div className="aspect-square bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl flex items-center justify-center mb-3 overflow-hidden">
                                  <ProductImage 
                                    src={product.image_url} 
                                    alt={product.name}
                                    className="w-full h-full"
                                  />
                                </div>
                                <div className="text-left">
                                  <h3 className="text-sm font-semibold text-gray-800 line-clamp-1">{product.name}</h3>
                                  {product.description && (
                                    <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{product.description}</p>
                                  )}
                                  <p className="text-lg font-bold text-blue-600 mt-1">{formatCurrency(product.unit_price)}</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="w-16 h-16 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                                  <ProductImage 
                                    src={product.image_url} 
                                    alt={product.name}
                                    className="w-full h-full"
                                  />
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                  <h3 className="text-sm font-semibold text-gray-800 truncate">{product.name}</h3>
                                  <p className="text-xs text-gray-500 truncate">{product.description || 'No description'}</p>
                                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${typeBadge.bg} ${typeBadge.text} flex items-center gap-1`}>
                                    <TypeIcon size={10} />
                                    {product.type}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-blue-600">{formatCurrency(product.unit_price)}</p>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddItem(product.id);
                                    }}
                                    className="mt-1 px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                                  >
                                    Add
                                  </button>
                                </div>
                              </>
                            )}
                          </motion.button>
                        );
                      })
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}

            {/* ===== BULK WATER TAB CONTENT ===== */}
            {activeTab === 'bulk' && (
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <Droplets size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Bulk Water Sale</h2>
                    <p className="text-sm text-gray-500">Sell water by the liter</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Price Display */}
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Price per Liter</span>
                      <span className="text-2xl font-bold text-emerald-600">{formatCurrency(waterPrice)}</span>
                    </div>
                  </div>

                  {/* Liters Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter Liters
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Droplets size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                        <input
                          ref={searchInputRef}
                          type="number"
                          step="0.5"
                          min="0.5"
                          placeholder="0.0"
                          value={waterLiters}
                          onChange={(e) => setWaterLiters(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="w-full pl-10 pr-4 py-3.5 text-lg font-semibold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const current = parseFloat(waterLiters) || 0;
                            setWaterLiters((current + 1).toString());
                          }}
                          className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-lg font-bold"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const current = parseFloat(waterLiters) || 0;
                            if (current > 0) {
                              setWaterLiters((current - 1).toString());
                            }
                          }}
                          className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-lg font-bold"
                        >
                          -
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Minimum: 0.5L • Step: 0.5L</p>
                  </div>

                  {/* Quick Amount Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {[5, 10, 20, 50, 100].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setWaterLiters(amount.toString())}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          parseFloat(waterLiters) === amount
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {amount}L
                      </button>
                    ))}
                  </div>

                  {/* Total Display */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-medium text-gray-700">Total Amount</span>
                      <span className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        {formatCurrency(waterTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  {/* <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={formLoading || !waterLiters || parseFloat(waterLiters) <= 0}
                    className="w-full py-4 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:hover:shadow-none"
                  >
                    {formLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </span>
                    ) : (
                      `Confirm Water Order • ${formatCurrency(waterTotal)}`
                    )}
                  </motion.button> */}
                </div>
              </div>
            )}
          </div>

          {/* ===== RIGHT PANEL - Cart / Customer ===== */}
          <div className="w-[420px] flex-shrink-0 hidden lg:block">
            <div className="sticky top-[88px]">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
                {/* Cart Header */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                        activeTab === 'products' 
                          ? 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-blue-500/25'
                          : 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/25'
                      }`}>
                        {activeTab === 'products' ? (
                          <ShoppingBag size={18} className="text-white" />
                        ) : (
                          <Droplets size={18} className="text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          {activeTab === 'products' ? 'Product Cart' : 'Water Order'}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {activeTab === 'products' 
                            ? `${cartItemCount} items` 
                            : `${parseFloat(waterLiters) || 0} liters`
                          }
                        </p>
                      </div>
                    </div>
                    {activeTab === 'products' && cartItems.length > 0 && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="text-xs text-red-500 hover:text-red-600 font-medium"
                      >
                        Clear All
                      </button>
                    )}
                    {activeTab === 'bulk' && waterLiters && parseFloat(waterLiters) > 0 && (
                      <button
                        type="button"
                        onClick={() => setWaterLiters('')}
                        className="text-xs text-red-500 hover:text-red-600 font-medium"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Customer Selection - Same for both tabs */}
                <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-gray-200 mb-3">
                    <button
                      type="button"
                      onClick={() => setOrderMode('registered')}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        orderMode === 'registered'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <User size={14} />
                      Registered
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderMode('walkin')}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        orderMode === 'walkin'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Users size={14} />
                      Walk-in
                    </button>
                  </div>

                  {orderMode === 'registered' ? (
                    <div className="relative">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search customer by name or phone..."
                          value={selectedCustomer ? `${selectedCustomer.name} ${selectedCustomer.phone ? `(${selectedCustomer.phone})` : ''}` : customerSearch}
                          onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            setFormData((prev) => ({ ...prev, customerId: '' }));
                            setShowCustomerDropdown(true);
                          }}
                          onFocus={() => setShowCustomerDropdown(true)}
                          className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
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
                      <AnimatePresence>
                        {showCustomerDropdown && customerSearch && !selectedCustomer && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto py-2"
                          >
                            {filteredCustomers.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-8 text-center">
                                <User size={24} className="text-gray-300 mb-2" />
                                <p className="text-sm text-gray-400">No customers found</p>
                              </div>
                            ) : (
                              filteredCustomers.map((user) => (
                                <button
                                  type="button"
                                  key={user.id}
                                  onClick={() => {
                                    setFormData((prev) => ({ ...prev, customerId: user.id }));
                                    setCustomerSearch('');
                                    setShowCustomerDropdown(false);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left group"
                                >
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                                    {user.name?.[0]?.toUpperCase() || '?'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{user.name || 'Unnamed'}</p>
                                    <p className="text-xs text-gray-400">{user.phone || 'No phone'}</p>
                                  </div>
                                  <Check size={16} className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              ))
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      {selectedCustomer && (
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                              {selectedCustomer.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{selectedCustomer.name}</p>
                              <div className="flex flex-col gap-0.5 text-xs text-gray-600">
                                {selectedCustomer.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone size={11} /> {selectedCustomer.phone}
                                  </span>
                                )}
                                {selectedCustomer.email && (
                                  <span className="flex items-center gap-1 truncate">
                                    <Mail size={11} /> {selectedCustomer.email}
                                  </span>
                                )}
                                {selectedCustomer.address && (
                                  <span className="flex items-center gap-1 truncate">
                                    <MapPin size={11} /> {selectedCustomer.address}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Check size={18} className="text-blue-600 flex-shrink-0" />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Customer name *"
                        value={walkinName}
                        onChange={(e) => setWalkinName(e.target.value)}
                        className="px-3 py-2.5 text-sm bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                      <input
                        type="text"
                        placeholder="Phone (optional)"
                        value={walkinPhone}
                        onChange={(e) => setWalkinPhone(e.target.value)}
                        className="px-3 py-2.5 text-sm bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* Order Type & Payment - Same for both tabs */}
                <div className="p-5 border-b border-gray-100 bg-gray-50/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Order Type</label>
                      <div className="flex bg-white rounded-xl border-2 border-gray-200 p-1">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, orderType: 'PICKUP' }))}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            formData.orderType === 'PICKUP'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <Package size={14} />
                          Pickup
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, orderType: 'HOME_DELIVERY' }))}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            formData.orderType === 'HOME_DELIVERY'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <Truck size={14} />
                          Delivery
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment</label>
                      <div className="flex bg-white rounded-xl border-2 border-gray-200 p-1">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'CASH' }))}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            formData.paymentMethod === 'CASH'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <Banknote size={14} />
                          Cash
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'ONLINE' }))}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            formData.paymentMethod === 'ONLINE'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <CreditCard size={14} />
                          Online
                        </button>
                      </div>
                    </div>
                  </div>
                  {formData.orderType === 'HOME_DELIVERY' && (
                    <div className="mt-3">
                      <div className="relative">
                        <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Delivery address"
                          value={formData.deliveryLocation}
                          onChange={(e) => setFormData(prev => ({ ...prev, deliveryLocation: e.target.value }))}
                          className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Cart Items - Only for Product Tab */}
                {activeTab === 'products' && (
                  <div className="max-h-[320px] overflow-y-auto p-3 space-y-2">
                    {cartItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <ShoppingCart size={32} className="text-gray-300 mb-3" />
                        <p className="text-sm text-gray-500">Cart is empty</p>
                        <p className="text-xs text-gray-400">Search and add products</p>
                      </div>
                    ) : (
                      cartItems.map((item, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="bg-white rounded-xl border border-gray-200 p-3 hover:border-blue-300 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                              <ProductImage 
                                src={item.image} 
                                alt={item.name}
                                className="w-full h-full"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                              <p className="text-xs text-gray-500">{formatCurrency(item.price)}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleItemChange(index, 'quantity', item.quantity - 1)}
                                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-8 text-center text-sm font-semibold text-gray-800">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleItemChange(index, 'quantity', item.quantity + 1)}
                                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-gray-300 hover:text-red-500 transition-colors p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${item.type === 'SEALED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                              {item.type === 'SEALED' ? <Droplet size={10} /> : <RefreshCw size={10} />}
                              {item.type}
                            </span>
                            <span className="text-sm font-semibold text-blue-600">{formatCurrency(item.subtotal)}</span>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                )}

                {/* Bulk Water Summary - Only for Bulk Tab */}
                {activeTab === 'bulk' && (
                  <div className="p-3 space-y-2">
                    {!waterLiters || parseFloat(waterLiters) <= 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Droplets size={32} className="text-gray-300 mb-3" />
                        <p className="text-sm text-gray-500">No water added</p>
                        <p className="text-xs text-gray-400">Enter liters to continue</p>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-700">Water Sale</p>
                            <p className="text-xs text-gray-500">{parseFloat(waterLiters)} liters @ {formatCurrency(waterPrice)}/L</p>
                          </div>
                          <span className="text-lg font-bold text-emerald-600">{formatCurrency(waterTotal)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Total & Submit - Changes based on tab */}
                <div className="p-5 border-t border-gray-100 bg-gray-50/50">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {activeTab === 'products' ? 'Subtotal' : 'Total'}
                      </span>
                      <span className="text-sm font-medium text-gray-800">
                        {activeTab === 'products' ? formatCurrency(cartTotal) : formatCurrency(waterTotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <span className="text-base font-bold text-gray-900">Total</span>
                      <span className={`text-xl font-bold ${
                        activeTab === 'products' 
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent'
                          : 'bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent'
                      }`}>
                        {activeTab === 'products' ? formatCurrency(cartTotal) : formatCurrency(waterTotal)}
                      </span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      disabled={formLoading || (activeTab === 'products' ? cartItems.length === 0 : !waterLiters || parseFloat(waterLiters) <= 0)}
                      className={`w-full py-3.5 text-sm font-bold text-white rounded-2xl hover:shadow-lg transition-all disabled:opacity-50 disabled:hover:shadow-none ${
                        activeTab === 'products'
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:shadow-blue-600/25'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-emerald-500/25'
                      }`}
                    >
                      {formLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Processing...
                        </span>
                      ) : (
                        activeTab === 'products' 
                          ? `Place Order • ${formatCurrency(cartTotal)}`
                          : `Confirm Water Order • ${formatCurrency(waterTotal)}`
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* ===== RECEIPT MODAL ===== */}
      <AnimatePresence>
        {showReceipt && lastOrder && (
          <>
            <style>{`
              @media print {
                body * { visibility: hidden; }
                #receipt-print-area, #receipt-print-area * { visibility: visible; }
                #receipt-print-area {
                  position: absolute; top: 0; left: 0; width: 100%;
                  padding: 20px; background: white;
                }
              }
            `}</style>

            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
              >
                <div id="receipt-print-area" className="p-6">
                  <div className="text-center border-b-2 border-dashed border-gray-200 pb-4 mb-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-lg mb-3 ${
                      lastOrder.type === 'bulk'
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/25'
                        : 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-blue-500/25'
                    }`}>
                      {lastOrder.type === 'bulk' ? (
                        <Droplets size={24} className="text-white" />
                      ) : (
                        <Droplet size={24} className="text-white" />
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Hanthana Water</h2>
                    <p className="text-xs text-gray-500">Order Receipt</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {lastOrder.date.toLocaleString()}
                    </p>
                    {lastOrder.type === 'bulk' && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-medium rounded-full">
                        Bulk Water
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-gray-600 space-y-1.5 mb-4">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-500">Order ID:</span>
                      <span className="font-mono text-gray-900">#{lastOrder.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-500">Customer:</span>
                      <span className="text-gray-900">{lastOrder.customerName || 'Walk-in'}</span>
                    </div>
                    {lastOrder.customerPhone && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-500">Phone:</span>
                        <span className="text-gray-900">{lastOrder.customerPhone}</span>
                      </div>
                    )}
                    {lastOrder.customerEmail && lastOrder.type === 'product' && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-500">Email:</span>
                        <span className="text-gray-900 text-xs truncate max-w-[150px]">{lastOrder.customerEmail}</span>
                      </div>
                    )}
                    {lastOrder.customerAddress && lastOrder.type === 'product' && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-500">Address:</span>
                        <span className="text-gray-900 text-xs truncate max-w-[150px]">{lastOrder.customerAddress}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-500">Type:</span>
                      <span className="text-gray-900">{lastOrder.orderType === 'HOME_DELIVERY' ? 'Home Delivery' : 'Pickup'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-500">Payment:</span>
                      <span className="text-gray-900">{lastOrder.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="border-t-2 border-dashed border-gray-200 pt-4 space-y-2">
                    {lastOrder.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-sm py-1">
                        <span className="text-gray-700">
                          {item.isBulkWater ? (
                            <span className="font-medium text-gray-900">{item.name}</span>
                          ) : (
                            <>
                              <span className="font-medium text-gray-900">{item.quantity}</span> × {item.name}
                            </>
                          )}
                        </span>
                        <span className="text-gray-900 font-medium">{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>

                  {lastOrder.type === 'bulk' && lastOrder.items[0]?.price && (
                    <div className="text-xs text-gray-400 text-center mt-1">
                      @ {formatCurrency(lastOrder.items[0].price)} / liter
                    </div>
                  )}

                  <div className="border-t-2 border-dashed border-gray-200 mt-4 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold text-gray-900">Total</span>
                      <span className={`text-xl font-bold ${
                        lastOrder.type === 'bulk'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent'
                          : 'bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent'
                      }`}>
                        {formatCurrency(lastOrder.total)}
                      </span>
                    </div>
                  </div>

                  <p className="text-center text-xs text-gray-400 mt-6">
                    Thank you for your order! 🎉
                  </p>
                </div>

                <div className="flex items-center gap-3 p-6 pt-0 border-t border-gray-100">
                  <button
                    onClick={handleCloseReceipt}
                    className="flex-1 px-4 py-3 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={handlePrintReceipt}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl hover:shadow-lg hover:shadow-blue-600/25 transition-all"
                  >
                    <Printer size={18} />
                    Print
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Cart Toggle */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-gray-200 z-20">
        <button
          type="button"
          onClick={() => {
            // Scroll to cart section on mobile
            const cartElement = document.querySelector('.lg\\:block .bg-white.rounded-2xl');
            if (cartElement) {
              cartElement.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className="w-full py-3.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
        >
          <ShoppingBag size={18} />
          {activeTab === 'products' ? (
            `Cart (${cartItemCount} items) • ${formatCurrency(cartTotal)}`
          ) : (
            `Water • ${parseFloat(waterLiters) || 0}L • ${formatCurrency(waterTotal)}`
          )}
          <ChevronUp size={18} />
        </button>
      </div>
    </div>
  );
}