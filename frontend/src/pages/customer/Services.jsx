import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package,
  Droplets,
  Building2,
  Truck,
  Siren,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';


const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const iconMap = {
  Package: Package,
  Droplets: Droplets,
  Building: Building2,
  Truck: Truck,
  Siren: Siren,
};



const colorSchemes = [
  {
    iconBg: 'from-blue-600 to-blue-700',
    cardBg: 'from-blue-50 to-cyan-50',
    border: 'border-blue-100/60',
    featureIcon: 'text-blue-500',
    ctaBg: 'bg-blue-600 hover:bg-blue-700',
    ctaShadow: 'shadow-blue-600/20',
  },
  {
    iconBg: 'from-cyan-500 to-blue-500',
    cardBg: 'from-cyan-50 to-blue-50',
    border: 'border-cyan-100/60',
    featureIcon: 'text-cyan-500',
    ctaBg: 'bg-cyan-600 hover:bg-cyan-700',
    ctaShadow: 'shadow-cyan-600/20',
  },
  {
    iconBg: 'from-indigo-500 to-blue-600',
    cardBg: 'from-indigo-50 to-blue-50',
    border: 'border-indigo-100/60',
    featureIcon: 'text-indigo-500',
    ctaBg: 'bg-indigo-600 hover:bg-indigo-700',
    ctaShadow: 'shadow-indigo-600/20',
  },
  {
    iconBg: 'from-blue-700 to-indigo-600',
    cardBg: 'from-blue-50 to-indigo-50',
    border: 'border-blue-100/60',
    featureIcon: 'text-blue-600',
    ctaBg: 'bg-blue-700 hover:bg-blue-800',
    ctaShadow: 'shadow-blue-700/20',
  },
  {
    iconBg: 'from-red-500 to-orange-500',
    cardBg: 'from-red-50 to-orange-50',
    border: 'border-red-100/60',
    featureIcon: 'text-red-500',
    ctaBg: 'bg-red-600 hover:bg-red-700',
    ctaShadow: 'shadow-red-600/20',
  },
];

const Services = () => {

  
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/settings/public');
        const data = await response.json();
        if (data.success && data.data.services) {
          setServices(data.data.services);
        }
      } catch (error) {
        console.error('Failed to load services:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600">

        {/* Image Background – visible and with dark overlay for text contrast */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img 
              src="/images/services.jpeg" 
              alt="Background" 
              className="w-full h-full object-cover opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
          </div>

        {/* Decorative elements */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute -bottom-20 left-1/3 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute top-20 right-1/4 w-32 h-32 bg-cyan-400/10 rounded-full" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28">
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
              Comprehensive water solutions for every need
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight"
            >
              Our Services
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed"
            >
              From sealed bottle delivery to emergency supply, Hanthana offers
              reliable, purified water solutions tailored to home, office, and
              industrial needs.
            </motion.p>
          </motion.div>
        </div>

        {/* Bottom wave */}
        {/* Truly seamless infinite wave – right‑to‑left */}
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
            /* Responsive heights */
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

      {/* Service Cards Section */}
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
              What We Offer
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
              Water Services Built Around You
            </h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto text-lg">
              Every service is designed with reliability, purity, and convenience
              in mind -- so you always have access to clean water when you need it.
            </p>
          </motion.div>

          {loading ? (
  <div className="flex justify-center py-20">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  </div>
) : (

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {services.map((service, index) => {
              const Icon = iconMap[service.icon] || Package;
              const scheme = colorSchemes[index % colorSchemes.length];
              return (
                <motion.div
                  key={service.id}
                  variants={fadeInUp}
                  transition={{ duration: 0.5 }}
                  className={`group relative bg-gradient-to-br ${scheme.cardBg} rounded-2xl p-8 hover:shadow-lg transition-all duration-300 border ${scheme.border} flex flex-col`}
                >
                  {/* Icon */}
                  <div
                    className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${scheme.iconBg} text-white mb-5 shadow-sm`}
                  >
                    <Icon className="w-7 h-7" />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900">
                    {service.name}
                  </h3>

                  {/* Description */}
                  <p className="mt-3 text-gray-600 leading-relaxed flex-1">
                    {service.description}
                  </p>

                  {/* Features list */}
                  <ul className="mt-5 space-y-2.5">
                    {service.features.map((feature, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <CheckCircle className={`w-4 h-4 ${scheme.featureIcon}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <div className="mt-6 pt-5 border-t border-gray-200/50">
                    <Link
                      to="/customer/order"
                      className={`inline-flex items-center gap-2 ${scheme.ctaBg} text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors duration-200 shadow-lg ${scheme.ctaShadow}`}
                    >
                      Get Started
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

)}
          
        </div>
      </section>

      {/* Bottom CTA Section */}
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
              Need a Custom Solution?
            </h2>
            <p className="mt-4 text-gray-500 text-lg max-w-2xl mx-auto">
              Whether it is a one-time bulk order or a recurring office supply
              plan, our team will work with you to create the perfect package.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/customer/order"
                onClick={(e) => {
                  e.preventDefault(); // Prevent navigation
                  window.dispatchEvent(
                    new CustomEvent("open-order-modal", { 
                      detail: { productId: null } // or undefined, or you can pass a specific product
                    })
                  );
                }}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl transition-colors duration-200 shadow-lg shadow-blue-600/20 text-lg"
              >
                Order Now
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-8 py-4 rounded-xl transition-colors duration-200 text-lg"
              >
                Contact Us
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Services;
