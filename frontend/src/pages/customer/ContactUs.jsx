import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, Send, MessageSquare } from 'lucide-react';

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

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2563EB] via-blue-600 to-cyan-600">

        {/* Image Background – visible and with dark overlay for text contrast */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img 
              src="/images/contactus.jpeg" 
              alt="Background" 
              className="w-full h-full object-cover opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
          </div>

        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute -bottom-20 left-1/3 w-64 h-64 bg-white/5 rounded-full" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
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
              <MessageSquare className="w-4 h-4" />
              Get in Touch
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight"
            >
              Contact Us
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed"
            >
              Have a question, feedback, or need assistance? We are here to
              help. Reach out to us through any of the channels below.
            </motion.p>
          </motion.div>
        </div>

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

      {/* Contact Form + Info Cards */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Contact Form */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
              className="lg:col-span-3 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Send Us a Message
              </h2>
              <p className="text-gray-500 mb-6">
                Fill out the form below and our team will get back to you within
                24 hours.
              </p>

              {submitted && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-medium"
                >
                  Thank you! Your message has been sent successfully. We will
                  get back to you soon.
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Name */}
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Your full name"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Phone */}
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+91-XXXXXXXXXX"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  {/* Subject */}
                  <div>
                    <label
                      htmlFor="subject"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      placeholder="How can we help?"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="Tell us more about your inquiry..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-[#1E3A8A] text-white font-semibold px-8 py-3.5 rounded-xl transition-colors duration-200 shadow-lg shadow-blue-600/20"
                >
                  <Send className="w-5 h-5" />
                  Submit Message
                </button>
              </form>
            </motion.div>

            {/* Info Cards */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={staggerContainer}
              className="lg:col-span-2 space-y-6"
            >
              {/* Hotline Card */}
              <motion.div
                variants={fadeInUp}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Hotline</h3>
                    <p className="mt-1 text-gray-500 text-sm">
                      Available 24/7 for orders and support
                    </p>
                    <p className="mt-2 text-blue-600 font-semibold text-base">
                      +94 76 835 6860
                    </p>
                    <p className="mt-1 text-gray-500 text-sm">
                      
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Email Card */}
              <motion.div
                variants={fadeInUp}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Email</h3>
                    <p className="mt-1 text-gray-500 text-sm">
                      We respond within 24 hours
                    </p>
                    <p className="mt-2 text-blue-600 font-semibold text-base">
                      support@hanthana.com
                    </p>
                    <p className="mt-1 text-gray-500 text-sm">
                      For general inquiries
                    </p>
                    <p className="mt-2 text-blue-600 font-semibold text-base">
                      orders@hanthana.com
                    </p>
                    <p className="mt-1 text-gray-500 text-sm">
                      For order-related queries
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Business Hours Card */}
              <motion.div
                variants={fadeInUp}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-cyan-500 text-white flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Business Hours
                    </h3>
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-sm gap-2">
                        <span className="text-gray-600">Monday - Saturday</span>
                        <span className="font-semibold text-gray-900">
                          7:00 AM - 9:00 PM
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Sunday</span>
                        <span className="font-semibold text-gray-900">
                          8:00 AM - 6:00 PM
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Emergency Delivery</span>
                        <span className="font-semibold text-blue-600">
                          24/7 Available
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Business Hours Detailed Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-[#2563EB] via-blue-600 to-cyan-600 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-white/5 rounded-full" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Detailed Business Hours
            </h2>
            <p className="mt-4 text-blue-100 text-lg max-w-xl mx-auto">
              Plan your visit or call during our operating hours for the best
              support experience.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 gap-5"
          >
            {[
              { day: 'Monday', hours: '7:00 AM - 9:00 PM', open: true },
              { day: 'Tuesday', hours: '7:00 AM - 9:00 PM', open: true },
              { day: 'Wednesday', hours: '7:00 AM - 9:00 PM', open: true },
              { day: 'Thursday', hours: '7:00 AM - 9:00 PM', open: true },
              { day: 'Friday', hours: '7:00 AM - 9:00 PM', open: true },
              { day: 'Saturday', hours: '7:00 AM - 9:00 PM', open: true },
              { day: 'Sunday', hours: '8:00 AM - 6:00 PM', open: true },
            ].map((schedule, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                transition={{ duration: 0.4 }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:bg-white/15 transition-all duration-300 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-white/70" />
                  <span className="font-semibold text-white text-base">
                    {schedule.day}
                  </span>
                </div>
                <span className="text-blue-100 text-sm font-medium">
                  {schedule.hours}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* Emergency note */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
            transition={{ duration: 0.5 }}
            className="mt-8 text-center"
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2.5 text-sm text-white border border-white/20">
              <Phone className="w-4 h-4" />
              <span>
                Emergency delivery available <strong>24/7</strong> -- Call{' '}
                <strong>+94 76 835 6860</strong>
              </span>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default ContactUs;
