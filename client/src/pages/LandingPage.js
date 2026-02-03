/**
 * Landing Page
 * Public homepage with information about the verification system
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiShield, 
  FiCheckCircle, 
  FiZap, 
  FiLock, 
  FiArrowRight,
  FiFileText,
  FiCreditCard,
  FiEye
} from 'react-icons/fi';

const LandingPage = () => {
  const features = [
    {
      icon: FiCheckCircle,
      title: 'Instant Verification',
      description: 'Verify Aadhaar and PAN cards in seconds using advanced OCR technology.'
    },
    {
      icon: FiLock,
      title: 'Secure & Private',
      description: 'Your documents are processed securely and automatically deleted after verification.'
    },
    {
      icon: FiZap,
      title: 'AI-Powered',
      description: 'Machine learning algorithms detect tampering and validate document authenticity.'
    },
    {
      icon: FiEye,
      title: 'QR Code Scanning',
      description: 'Automatic QR code detection and validation for Aadhaar cards.'
    }
  ];

  const steps = [
    { step: 1, title: 'Upload Document', description: 'Upload your Aadhaar or PAN card image' },
    { step: 2, title: 'AI Processing', description: 'Our system analyzes and verifies the document' },
    { step: 3, title: 'Get Results', description: 'Receive detailed verification results instantly' }
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-government-blue">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <FiShield className="w-8 h-8 text-government-gold" />
              <span className="text-white font-display font-bold text-xl">DocVerify</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-white/80 hover:text-white transition-colors px-4 py-2"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="bg-government-gold text-government-blue px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-6">
              Document Verification
              <span className="block text-government-gold">Made Simple</span>
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">
              Verify Aadhaar and PAN cards instantly with our secure, AI-powered verification system. 
              Trusted by thousands for accurate document authentication.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 bg-government-gold text-government-blue px-8 py-4 rounded-lg font-bold text-lg hover:bg-yellow-400 transition-all transform hover:scale-105"
              >
                Start Verifying Now
                <FiArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 bg-white/10 text-white border border-white/30 px-8 py-4 rounded-lg font-bold text-lg hover:bg-white/20 transition-all"
              >
                Login to Dashboard
              </Link>
            </div>
          </motion.div>

          {/* Document Cards Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-16 flex justify-center gap-8"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <FiFileText className="w-12 h-12 text-government-gold mx-auto mb-3" />
              <p className="text-white font-medium">Aadhaar Card</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <FiCreditCard className="w-12 h-12 text-government-gold mx-auto mb-3" />
              <p className="text-white font-medium">PAN Card</p>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-4">
              Why Choose DocVerify?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our advanced verification system ensures accuracy, security, and speed for all your document verification needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="w-14 h-14 bg-government-blue/10 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-7 h-7 text-government-blue" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Verify your documents in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative"
              >
                <div className="bg-white rounded-xl p-8 text-center shadow-card">
                  <div className="w-16 h-16 bg-government-blue text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <FiArrowRight className="w-8 h-8 text-gray-300" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-government-blue">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-6">
              Ready to Verify Your Documents?
            </h2>
            <p className="text-white/80 text-lg mb-8">
              Join thousands of users who trust DocVerify for secure document verification.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 bg-government-gold text-government-blue px-8 py-4 rounded-lg font-bold text-lg hover:bg-yellow-400 transition-all transform hover:scale-105"
            >
              Create Free Account
              <FiArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-government-darkBlue text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <FiShield className="w-6 h-6 text-government-gold" />
              <span className="font-display font-bold">DocVerify</span>
            </div>
            <p className="text-white/60 text-sm text-center">
              © {new Date().getFullYear()} Document Verification System. Demo Project.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
