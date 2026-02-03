/**
 * Scanning Animation Component
 * Displays a scanning animation during document processing
 */

import React from 'react';
import { motion } from 'framer-motion';

const ScanningAnimation = ({ text = 'Scanning document...' }) => {
  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Document frame */}
      <motion.div
        className="relative bg-white rounded-xl shadow-lg overflow-hidden aspect-[3/4] border-2 border-gray-200"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {/* Document lines (placeholder) */}
        <div className="absolute inset-0 p-6">
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="h-4 bg-gray-100 rounded"
                style={{ width: `${70 + Math.random() * 30}%` }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              />
            ))}
          </div>
          
          {/* QR code placeholder */}
          <motion.div
            className="absolute bottom-6 right-6 w-16 h-16 bg-gray-100 rounded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="grid grid-cols-4 gap-0.5 p-1">
              {[...Array(16)].map((_, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-sm ${Math.random() > 0.5 ? 'bg-gray-300' : 'bg-gray-100'}`}
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Scanning line */}
        <motion.div
          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-government-blue to-transparent"
          animate={{
            top: ['0%', '100%', '0%']
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear'
          }}
        />

        {/* Corner brackets */}
        <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-government-blue" />
        <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-government-blue" />
        <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-government-blue" />
        <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-government-blue" />
      </motion.div>

      {/* Processing indicator */}
      <div className="mt-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <motion.div
            className="w-2 h-2 bg-government-blue rounded-full"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.2 }}
          />
          <motion.div
            className="w-2 h-2 bg-government-blue rounded-full"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.2, delay: 0.2 }}
          />
          <motion.div
            className="w-2 h-2 bg-government-blue rounded-full"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.2, delay: 0.4 }}
          />
        </div>
        <motion.p
          className="text-gray-600 font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {text}
        </motion.p>
      </div>
    </div>
  );
};

export default ScanningAnimation;
