import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Eye, MapPin, Users, Calendar, Award, Heart } from 'lucide-react';
import { companyTimeline} from '../../data/mockData';

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

const getInitials = (name) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('');

const AboutUs = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);          

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/settings/public');
        const data = await response.json();
        if (data.success && data.data.team) {
          setTeamMembers(data.data.team);
        }
      } catch (error) {
        console.error('Failed to load team:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero / Company Story */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2563EB] via-blue-600 to-cyan-600">

        {/* Image Background – visible and with dark overlay for text contrast */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img 
              src="/images/aboutus.jpeg" 
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
              <Heart className="w-4 h-4" />
              Our Story
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight"
            >
              Purity in Every Drop,
              <br />
              <span className="text-cyan-300">Trust in Every Delivery</span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-lg sm:text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed"
            >
              Hanthana was founded in 2018 with a simple mission: make clean,
              safe drinking water accessible to every home and business in Sri Lanka.
              Our journey has been driven by innovation, commitment to
              quality, and an unwavering focus on customer satisfaction.
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

      {/* Mission & Vision */}
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
              What Drives Us
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
              Mission &amp; Vision
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* Mission Card */}
            <motion.div
              variants={fadeInUp}
              transition={{ duration: 0.5 }}
              className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-600 text-white mb-6">
                <Target className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Our Mission</h3>
              <p className="mt-4 text-gray-600 leading-relaxed">
                To deliver safe, pure, and affordable drinking water to every
                household and business across Sri Lanka. We are committed to
                leveraging technology and operational excellence to ensure
                reliable, on-time delivery while maintaining the highest quality
                standards at every step of the supply chain.
              </p>
            </motion.div>

            {/* Vision Card */}
            <motion.div
              variants={fadeInUp}
              transition={{ duration: 0.5 }}
              className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#1E3A8A] text-white mb-6">
                <Eye className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Our Vision</h3>
              <p className="mt-4 text-gray-600 leading-relaxed">
                To become Sri Lanka's most trusted water management company,
                recognized for innovation, sustainability, and customer-first
                service. We envision a future where every community has reliable
                access to clean water, powered by smart logistics, and a nationwide network of dedicated professionals.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Company Timeline */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
              Our Journey
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
              Company Timeline
            </h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto text-lg">
              From a single branch to a nationwide network, explore the
              milestones that shaped Hanthana.
            </p>
          </motion.div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 sm:left-7 top-0 bottom-0 w-0.5 bg-blue-200" />

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.05 }}
              variants={staggerContainer}
              className="space-y-8"
            >
              {companyTimeline.map((event, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  transition={{ duration: 0.4 }}
                  className="relative pl-16 sm:pl-20"
                >
                  {/* Year marker circle */}
                  <div className="absolute left-2 sm:left-4 top-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-600 border-4 border-white shadow-md flex items-center justify-center">
                    <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                  </div>

                  {/* Year label */}
                  <div className="absolute left-11 sm:left-14 top-0">
                    <span className="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      {event.year}
                    </span>
                  </div>

                  {/* Content card */}
                  <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">
                      {event.title}
                    </h3>
                    <p className="mt-2 text-gray-600 leading-relaxed text-sm">
                      {event.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Team Members */}
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
              Leadership
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
              Meet Our Team
            </h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto text-lg">
              The passionate leaders driving Hanthana's mission to deliver
              purity across Sri Lanka.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {teamMembers.map((member, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                transition={{ duration: 0.4 }}
                className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 text-center"
              >
                {/* Avatar with initials */}
                {member.photoUrl ? (
      <img
        src={member.photoUrl}
        alt={member.name}
        className="mx-auto w-20 h-20 rounded-full object-cover mb-5 group-hover:scale-105 transition-transform duration-300"
      />
    ) : (
      <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold mb-5 group-hover:scale-105 transition-transform duration-300">
        {getInitials(member.name)}
      </div>
    )}

                <h3 className="text-lg font-bold text-gray-900">
                  {member.name}
                </h3>
                <p className="mt-1 text-sm text-blue-600 font-semibold">
                  {member.role}
                </p>
                <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                  {member.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Values / Why Us Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-[#2563EB] via-blue-600 to-cyan-600 relative overflow-hidden">
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
              Our Core Values
            </h2>
            <p className="mt-4 text-blue-100 text-lg max-w-xl mx-auto">
              The principles that guide everything we do at Hanthana.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              {
                icon: Award,
                title: 'Quality First',
                description:
                  'Every drop meets BIS standards through multi-stage filtration and UV purification.',
              },
              {
                icon: Users,
                title: 'Customer Obsessed',
                description:
                  '10,000+ happy customers trust us because we put their needs at the center of everything.',
              },
              {
                icon: Heart,
                title: 'Community Driven',
                description:
                  'We invest in local communities, creating jobs and supporting water access initiatives.',
              },
              {
                icon: Target,
                title: 'Innovation Led',
                description:
                  'Demand prediction, route optimization, and smart logistics for the future.',
              },
            ].map((value, index) => {
              const Icon = value.icon;
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
                  <h3 className="text-lg font-bold text-white">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-blue-100 text-sm leading-relaxed">
                    {value.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;
