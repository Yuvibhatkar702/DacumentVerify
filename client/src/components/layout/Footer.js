/**
 * Footer Component
 */

import React from 'react';
import { FiShield, FiMail, FiPhone } from 'react-icons/fi';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-government-darkBlue text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FiShield className="w-6 h-6 text-government-gold" />
              <span className="font-display font-bold text-lg">DocVerify</span>
            </div>
            <p className="text-white/70 text-sm">
              Secure document verification system for Aadhaar and PAN cards.
              Ensuring authenticity with advanced OCR and AI technology.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <a href="/dashboard" className="hover:text-white transition-colors">Dashboard</a>
              </li>
              <li>
                <a href="/verify/aadhaar" className="hover:text-white transition-colors">Verify Aadhaar</a>
              </li>
              <li>
                <a href="/verify/pan" className="hover:text-white transition-colors">Verify PAN</a>
              </li>
              <li>
                <a href="/history" className="hover:text-white transition-colors">History</a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex items-center gap-2">
                <FiMail className="w-4 h-4" />
                <span>support@docverify.gov.in</span>
              </li>
              <li className="flex items-center gap-2">
                <FiPhone className="w-4 h-4" />
                <span>1800-XXX-XXXX (Toll Free)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-8 pt-6 text-center text-sm text-white/50">
          <p>© {currentYear} Document Verification System. All rights reserved.</p>
          <p className="mt-1">
            This is a demonstration project. Not affiliated with any government agency.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
