/**
 * Status Badge Component
 * Displays verification status with appropriate colors
 */

import React from 'react';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiAlertTriangle, FiXCircle, FiClock } from 'react-icons/fi';

const StatusBadge = ({ status, showIcon = true, size = 'medium' }) => {
  const config = {
    verified: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-200',
      icon: FiCheckCircle,
      label: 'Verified'
    },
    suspicious: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
      icon: FiAlertTriangle,
      label: 'Suspicious'
    },
    rejected: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-200',
      icon: FiXCircle,
      label: 'Rejected'
    },
    pending: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      border: 'border-gray-200',
      icon: FiClock,
      label: 'Pending'
    },
    processing: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-200',
      icon: FiClock,
      label: 'Processing'
    }
  };

  const sizeClasses = {
    small: 'px-2 py-0.5 text-xs',
    medium: 'px-3 py-1 text-sm',
    large: 'px-4 py-2 text-base'
  };

  const currentConfig = config[status?.toLowerCase()] || config.pending;
  const Icon = currentConfig.icon;

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium border
        ${currentConfig.bg} ${currentConfig.text} ${currentConfig.border}
        ${sizeClasses[size]}
      `}
    >
      {showIcon && <Icon className="w-4 h-4" />}
      {currentConfig.label}
    </motion.span>
  );
};

export default StatusBadge;
