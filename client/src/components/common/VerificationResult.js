/**
 * Verification Result Component
 * Displays the result of document verification
 */

import React from 'react';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiAlertTriangle, FiXCircle, FiClock, FiInfo } from 'react-icons/fi';
import StatusBadge from './StatusBadge';
import ConfidenceScore from './ConfidenceScore';

const VerificationResult = ({ result, documentType }) => {
  if (!result) return null;

  const { status, confidenceScore, extractedData, verificationDetails, processingTime } = result;

  const statusConfig = {
    verified: {
      icon: FiCheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      title: 'Document Verified Successfully',
      description: 'The document has passed all verification checks.'
    },
    suspicious: {
      icon: FiAlertTriangle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      title: 'Document Requires Review',
      description: 'Some verification checks raised concerns. Manual review recommended.'
    },
    rejected: {
      icon: FiXCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      title: 'Verification Failed',
      description: 'The document could not be verified. Please check and try again.'
    },
    pending: {
      icon: FiClock,
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      title: 'Pending Verification',
      description: 'Document verification is in progress.'
    }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border-2 ${config.borderColor} ${config.bgColor} overflow-hidden`}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          >
            <Icon className={`w-12 h-12 ${config.color}`} />
          </motion.div>
          <div className="flex-grow">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-gray-800">{config.title}</h3>
              <StatusBadge status={status} />
            </div>
            <p className="text-gray-600">{config.description}</p>
          </div>
        </div>
      </div>

      {/* Confidence Score */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <ConfidenceScore score={confidenceScore} size="large" />
      </div>

      {/* Extracted Data */}
      <div className="p-6 bg-white">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FiInfo className="w-5 h-5" />
          Extracted Information
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documentType === 'aadhaar' ? (
            <>
              <DataField label="Aadhaar Number" value={extractedData?.aadhaarNumber} masked />
              <DataField label="Name" value={extractedData?.name} />
              <DataField label="Date of Birth" value={extractedData?.dateOfBirth} />
              <DataField label="Gender" value={extractedData?.gender} />
              <DataField label="Address" value={extractedData?.address} className="md:col-span-2" />
              <DataField 
                label="QR Code Detected" 
                value={extractedData?.qrCodeDetected ? 'Yes' : 'No'} 
              />
            </>
          ) : (
            <>
              <DataField label="PAN Number" value={extractedData?.panNumber} />
              <DataField label="Name" value={extractedData?.name} />
              <DataField label="Father's Name" value={extractedData?.fatherName} />
              <DataField label="Date of Birth" value={extractedData?.dateOfBirth} />
              <DataField label="Holder Type" value={extractedData?.holderType} />
            </>
          )}
        </div>
      </div>

      {/* Verification Details */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">Verification Checks</h4>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <CheckItem 
            label="Number Valid" 
            passed={verificationDetails?.numberValid} 
          />
          <CheckItem 
            label="Format Valid" 
            passed={verificationDetails?.formatValid} 
          />
          {documentType === 'aadhaar' && (
            <>
              <CheckItem 
                label="QR Code Found" 
                passed={verificationDetails?.qrCodeFound} 
              />
              <CheckItem 
                label="QR Data Matches" 
                passed={verificationDetails?.qrDataMatches} 
              />
              <CheckItem 
                label="Checksum Valid" 
                passed={verificationDetails?.checksumValid} 
              />
            </>
          )}
        </div>

        {/* Validation Messages */}
        {verificationDetails?.validationMessages?.length > 0 && (
          <div className="mt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Details:</h5>
            <ul className="space-y-1">
              {verificationDetails.validationMessages.map((msg, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="text-sm text-gray-600 flex items-start gap-2"
                >
                  <span className="text-gray-400">•</span>
                  {msg}
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {/* Processing Time */}
        {processingTime && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Processing time: {processingTime}ms
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Data Field Component
const DataField = ({ label, value, masked = false, className = '' }) => (
  <div className={`bg-gray-50 rounded-lg p-3 ${className}`}>
    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
    <p className={`font-medium ${value ? 'text-gray-800' : 'text-gray-400'}`}>
      {value || 'Not extracted'}
    </p>
  </div>
);

// Check Item Component
const CheckItem = ({ label, passed }) => (
  <div className="flex items-center gap-2">
    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
      passed ? 'bg-green-100' : 'bg-gray-100'
    }`}>
      {passed ? (
        <FiCheckCircle className="w-3 h-3 text-green-600" />
      ) : (
        <FiXCircle className="w-3 h-3 text-gray-400" />
      )}
    </div>
    <span className="text-sm text-gray-600">{label}</span>
  </div>
);

export default VerificationResult;
