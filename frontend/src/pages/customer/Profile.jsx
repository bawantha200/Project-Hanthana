import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, MapPin, CreditCard, Settings, Bell, Mail, Shield, CreditCard as Edit2, Plus } from 'lucide-react';
import { customerOrders } from '../../data/mockData';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const profileData = {
  name: 'Rahul Verma',
  email: 'rahul@email.com',
  phone: '+91-9988776655',
  address: '42 MG Road, Mumbai',
  joinDate: '2024-03-15',
  avatar: 'RV',
};

const addresses = [
  { id: 1, label: 'Home', address: '42 MG Road, Mumbai 400001', phone: '+91-9988776655', isPrimary: true },
  { id: 2, label: 'Office', address: '15 Andheri East, Mumbai 400069', phone: '+91-9988776655', isPrimary: false },
];

const paymentMethods = [
  { id: 1, type: 'UPI', detail: 'rahul@upi', icon: 'mobile', isDefault: true },
  { id: 2, type: 'Credit Card', detail: '**** **** **** 4532', icon: 'card', isDefault: false },
  { id: 3, type: 'Net Banking', detail: 'HDFC Bank', icon: 'bank', isDefault: false },
];

const Profile = () => {
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [deliveryUpdates, setDeliveryUpdates] = useState(true);
  const [promotionalOffers, setPromotionalOffers] = useState(false);

  const totalOrders = customerOrders.length;
  const totalSpent = customerOrders.reduce((sum, o) => sum + o.amount, 0);
  const deliveredOrders = customerOrders.filter(o => o.status === 'Delivered').length;
  const pendingOrders = customerOrders.filter(o => o.status !== 'Delivered').length;

  const ToggleSwitch = ({ enabled, onToggle, label }) => (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
          enabled ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="mt-1 text-gray-500">Manage your account settings and preferences</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Information Section */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                </div>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors duration-200">
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-200">
                  <span className="text-2xl font-bold text-white">{profileData.avatar}</span>
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Full Name</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{profileData.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Email</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{profileData.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Phone</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{profileData.phone}</p>
                  </div>
                  
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Address</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{profileData.address}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Member Since</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{profileData.joinDate}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Address Management */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Saved Addresses</h2>
                </div>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors duration-200">
                  <Plus className="w-3.5 h-3.5" />
                  Add New
                </button>
              </div>

              <div className="space-y-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-sm ${
                      addr.isPrimary
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-150 hover:border-blue-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      addr.isPrimary ? 'bg-blue-600' : 'bg-gray-300'
                    }`}>
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">{addr.label}</h3>
                        {addr.isPrimary && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{addr.address}</p>
                      <p className="text-xs text-gray-400 mt-1">{addr.phone}</p>
                    </div>
                    <button className="p-1.5 rounded-lg hover:bg-white/60 transition-colors duration-200">
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Payment Details Section */}
            {/* <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
                </div>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors duration-200">
                  <Plus className="w-3.5 h-3.5" />
                  Add New
                </button>
              </div>

              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-sm ${
                      method.isDefault
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-gray-50 border-gray-150 hover:border-emerald-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      method.isDefault ? 'bg-emerald-600' : 'bg-gray-300'
                    }`}>
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">{method.type}</h3>
                        {method.isDefault && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-600 text-white">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{method.detail}</p>
                    </div>
                    <button className="p-1.5 rounded-lg hover:bg-white/60 transition-colors duration-200">
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div> */}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Order History Summary */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <span className="text-sm text-gray-600">Total Orders</span>
                  <span className="text-sm font-bold text-blue-700">{totalOrders}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <span className="text-sm text-gray-600">Delivered</span>
                  <span className="text-sm font-bold text-emerald-700">{deliveredOrders}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-yellow-50 border border-yellow-100">
                  <span className="text-sm text-gray-600">Pending</span>
                  <span className="text-sm font-bold text-yellow-700">{pendingOrders}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100">
                  <span className="text-sm text-gray-600">Total Spent</span>
                  <span className="text-sm font-bold text-blue-700">LKR {totalSpent.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Recent orders list */}
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Orders</p>
                <div className="space-y-2">
                  {customerOrders.slice(0, 3).map((order) => (
                    <div key={order.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors duration-150">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{order.product}</p>
                        <p className="text-xs text-gray-400">{order.id} &middot; {order.date}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        order.status === 'Delivered'
                          ? 'bg-emerald-100 text-emerald-700'
                          : order.status === 'Preparing'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Account Settings */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Account Settings</h2>
              </div>

              {/* <div className="divide-y divide-gray-100">
                <div className="flex items-center gap-3 py-3">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700 flex-1">Push Notifications</span>
                </div>
                <ToggleSwitch
                  label="Order notifications"
                  enabled={notifications}
                  onToggle={() => setNotifications(!notifications)}
                />
                <ToggleSwitch
                  label="Delivery updates"
                  enabled={deliveryUpdates}
                  onToggle={() => setDeliveryUpdates(!deliveryUpdates)}
                />

                <div className="flex items-center gap-3 py-3 mt-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700 flex-1">Email Preferences</span>
                </div>
                <ToggleSwitch
                  label="Email updates"
                  enabled={emailUpdates}
                  onToggle={() => setEmailUpdates(!emailUpdates)}
                />
                <ToggleSwitch
                  label="Promotional offers"
                  enabled={promotionalOffers}
                  onToggle={() => setPromotionalOffers(!promotionalOffers)}
                />

                <div className="flex items-center gap-3 py-3 mt-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700 flex-1">Security</span>
                </div>
                <ToggleSwitch
                  label="SMS alerts for deliveries"
                  enabled={smsAlerts}
                  onToggle={() => setSmsAlerts(!smsAlerts)}
                />
              </div> */}

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-gray-100 space-y-3">
                <button className="w-full py-2.5 rounded-xl text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors duration-200">
                  Change Password
                </button>
                <button className="w-full py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors duration-200">
                  Delete Account
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
