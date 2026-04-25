/**
 * Aadhaar Verification Page
 */

import React from 'react';
import { FiFileText } from 'react-icons/fi';
import DocumentUpload from '../components/common/DocumentUpload';

const AadhaarVerification = () => {
  return (
    <div className="page-container">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <FiFileText className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900">Aadhaar Card Verification</h1>
            <p className="text-gray-600">Upload your Aadhaar card to verify QR and printed data</p>
          </div>
        </div>
      </div>

      <DocumentUpload documentType="aadhaar" />
    </div>
  );
};

export default AadhaarVerification;
