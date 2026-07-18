import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Droplets,
  ShoppingBag,
  Truck,
  Shield,
  MapPin,
  Star,
  Users,
  Package,
  Award,
  ChevronRight,
  ArrowRight,
  Headphones,
  Calendar,
} from 'lucide-react';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const deliveryHighlights = [
  {
    icon: Truck,
    title: 'Fast Delivery',
    description: 'Same-day delivery available across all service areas. Emergency orders delivered within 2 hours.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Shield,
    title: 'Safe & Pure',
    description: 'Multi-stage filtration and UV purification. Every drop meets BIS quality standards for your safety.',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    icon: ShoppingBag,
    title: 'Easy Tracking',
    description: 'Real-time order tracking from warehouse to your doorstep. Get live updates on delivery status.',
    color: 'from-blue-600 to-indigo-600',
  },
];



const refillServices = [
  {
    icon: Droplets,
    title: '19L Refill Service',
    description: 'Eco-friendly water refill for your existing 19L bottles. We collect empties and deliver fresh refills on schedule.',
    features: ['Scheduled deliveries', 'Eco-friendly', 'Subscription plans'],
  },
  {
    icon: Package,
    title: 'Sealed Bottle Delivery',
    description: 'Fresh factory-sealed bottles in 500ml, 1L, 5L, and 19L sizes. Perfect for homes and offices.',
    features: ['Multiple sizes', 'Same-day delivery', 'Bulk discounts'],
  },
  {
    icon: Truck,
    title: 'Emergency Delivery',
    description: 'Urgent water delivery within 2 hours, available 24/7. Priority dispatch for critical situations.',
    features: ['2-hour delivery', '24/7 availability', 'Priority dispatch'],
  },
];


// const stats = [
//   { value: '10,000+', label: 'Customers', icon: Users },
//   { value: '50,000+', label: 'Deliveries', icon: Truck },
//   { value: '99.9%', label: 'Quality', icon: Award },
//   { value: '24/7', label: 'Support', icon: Headphones },
// ];

// ✅ Component එක ඇතුළේ Hooks භාවිතා කරන්න
export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroImageUrl, setHeroImageUrl] = useState('/images/carousel0.jpeg');
  const [settings, setSettings] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);



  const iconMap = [Users, Calendar, Truck, MapPin];

  const stats = (settings?.general?.stats || []).map((stat, i) => ({
    ...stat,
    icon: iconMap[i] || Users,
  }));

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/products');
        const data = await response.json();
        if (data.success) {
          setProducts(data.data || []);
        }
      } catch (error) {
        console.error('Fetch products error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
  const fetchSettings = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/settings/public');
      const data = await response.json();

      console.log("HOME SETTINGS:", data);

      if (data.success) {
        setSettings(data.data);

        if (data.data?.general?.heroImageUrl) {
          setHeroImageUrl(data.data.general.heroImageUrl);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  fetchSettings();
}, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600">

       
    
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
  {!imageLoaded && (
    <div className="absolute inset-0 bg-gray-200 animate-pulse" />
  )}
  <img
    src={settings?.general?.heroImageUrl || '/images/default-hero.jpg'}
    alt="Background"
    onLoad={() => setImageLoaded(true)}
    className={`w-full h-full object-cover transition-opacity duration-500 ${
      imageLoaded ? 'opacity-100' : 'opacity-0'
    }`}
  />
  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
</div>
  
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center"
          >
            <motion.div
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-blue-100 mb-6"
            >
              <Droplets className="w-4 h-4" />
              Trusted by 10,000+ customers across Sri Lanka
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white leading-tight tracking-tight"
            >
              Pure Water
              <br />
              Delivered Fast
              <br />
              <span className="text-cyan-300">&amp; Safely</span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed"
            >
              From doorstep delivery to emergency supply, Hanthana ensures
              clean, purified water reaches you whenever you need it.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
             
              <Link
                to="/services"
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-all duration-200 text-lg"
              >
                Explore Services
                <ChevronRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </motion.div>
        </div>

        <style>
          {`
            .wave-wrap {
              position: absolute;
              bottom: 0;
              left: 0;
              width: 100%;
              height: 150px;
              overflow: hidden;
              pointer-events: none;
              z-index: 2;
            }
            .wave-track {
              position: absolute;
              bottom: 0;
              left: 0;
              width: 200%;
              height: 100%;
              background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 150' preserveAspectRatio='none'%3E%3Cpath d='M0,150 C400,130 500,60 800,60 C1100,60 1200,130 1600,150' fill='%23F9FAFB' /%3E%3C/svg%3E") repeat-x bottom;
              background-size: 50% 100%;
              will-change: transform;
            }
            .wave-slide {
              animation: slideRight 12s linear infinite;
              bottom: -1px;
            }
            .wave-swell {
              animation: slideRight 16s linear infinite, verticalSwell 6s ease-in-out infinite;
              opacity: 0.7;
              bottom: -15px;
            }
            @keyframes slideRight {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            @keyframes verticalSwell {
              0%, 100% { transform: translateX(-50%) translateY(0); }
              50% { transform: translateX(-50%) translateY(-14px); }
            }
            @media (max-width: 1024px) { .wave-wrap { height: 120px; } }
            @media (max-width: 768px) { .wave-wrap { height: 90px; } }
            @media (max-width: 480px) { .wave-wrap { height: 60px; } }
          `}
        </style>

        <div className="wave-wrap">
          <div className="wave-track wave-slide"></div>
          <div className="wave-track wave-swell"></div>
        </div>
      </section>

      {/* Product Cards Section - ✅ Database Products Display */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
              Our Products
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
              Water Bottles for Every Need
            </h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto text-lg">
              Choose from our range of sealed bottles and refill services,
              all purified to the highest standards.
            </p>
          </motion.div>

          {/* ✅ Loading State */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No products available
            </div>
          ) : (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6"
            >
              {products.map((product) => (
                <motion.div
                  key={product.id}
                  variants={fadeInUp}
                  transition={{ duration: 0.4 }}
                  className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100"
                >
                  <div className="relative h-48 bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center overflow-hidden">
                    <img
                      src={product.image_url || '/images/default-product.jpg'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span
                      className={`absolute top-3 right-3 text-xs font-semibold px-3 py-1 rounded-full ${
                        product.type === 'SEALED'
                          ? 'bg-blue-600 text-white'
                          : 'bg-cyan-500 text-white'
                      }`}
                    >
                      {product.type === 'SEALED' ? 'Sealed' : 'Refill'}
                    </span>
                  </div>

                  <div className="p-5">
                    <h3 className="font-semibold text-gray-900 text-base">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-2xl font-bold text-blue-600">
                        LKR {Number(product.unit_price).toFixed(2)}
                      </span>
                      <Link
                        to="/customer/order"
                        className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200"
                      >
                        Add to Order
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Refill Service Cards Section - No Changes */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
              Our Services
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
              Water Solutions for Everyone
            </h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto text-lg">
              Whether you need regular home supply or bulk commercial delivery,
              we have the right service for you.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {refillServices.map((service, index) => {
              const Icon = service.icon;
              return (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  transition={{ duration: 0.5 }}
                  className="group bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 hover:shadow-lg transition-all duration-300 border border-blue-100/50"
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-600 text-white mb-5">
                    <Icon className="w-7 h-7" />
                  </div>

                  <h3 className="text-xl font-bold text-gray-900">
                    {service.title}
                  </h3>
                  <p className="mt-3 text-gray-600 leading-relaxed">
                    {service.description}
                  </p>

                  <ul className="mt-5 space-y-2">
                    {service.features.map((feature, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <ChevronRight className="w-4 h-4 text-blue-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Delivery Highlights Section */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
              Why Choose Us
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
              Delivery You Can Trust
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {deliveryHighlights.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  transition={{ duration: 0.5 }}
                  className="relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100"
                >
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.color}`}
                  />

                  <div
                    className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} text-white mb-5`}
                  >
                    <Icon className="w-7 h-7" />
                  </div>

                  <h3 className="text-xl font-bold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-white/5 rounded-full" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Hanthana in Numbers
            </h2>
            <p className="mt-4 text-blue-100 text-lg max-w-xl mx-auto">
              Delivering trust and purity across Sri Lanka since 2018.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  transition={{ duration: 0.5 }}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 sm:p-8 text-center border border-white/10 hover:bg-white/15 transition-all duration-300"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 text-white mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <p className="text-3xl sm:text-4xl font-extrabold text-white">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-blue-200 font-medium text-sm sm:text-base">
                    {stat.label}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Ready to Get Started?
            </h2>
            <p className="mt-4 text-gray-500 text-lg max-w-2xl mx-auto">
              Join thousands of happy customers who trust Hanthana for their
              daily water needs. Place your first order today.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              
              <Link
                to="/services"
                className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-8 py-4 rounded-xl transition-colors duration-200 text-lg"
              >
                View All Services
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}