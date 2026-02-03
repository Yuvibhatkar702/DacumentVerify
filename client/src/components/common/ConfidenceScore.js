/**
 * Confidence Score Component
 * Displays verification confidence as a visual meter
 */

import React from 'react';
import { motion } from 'framer-motion';

const ConfidenceScore = ({ score, size = 'medium', showLabel = true }) => {
  // Determine color based on score
  const getColor = (value) => {
    if (value >= 70) return { bg: 'bg-green-500', text: 'text-green-600' };
    if (value >= 40) return { bg: 'bg-yellow-500', text: 'text-yellow-600' };
    return { bg: 'bg-red-500', text: 'text-red-600' };
  };

  const color = getColor(score);

  const sizeClasses = {
    small: { bar: 'h-2', text: 'text-sm' },
    medium: { bar: 'h-3', text: 'text-base' },
    large: { bar: 'h-4', text: 'text-lg' }
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className={`font-medium text-gray-700 ${sizeClasses[size].text}`}>
            Confidence Score
          </span>
          <span className={`font-bold ${color.text} ${sizeClasses[size].text}`}>
            {score}%
          </span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size].bar}`}>
        <motion.div
          className={`${sizeClasses[size].bar} ${color.bg} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

export default ConfidenceScore;
