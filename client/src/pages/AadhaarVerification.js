/**
 * Aadhaar Verification Page
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFileText, FiUpload, FiRefreshCw, FiInfo } from 'react-icons/fi';
import FileDropzone from '../components/common/FileDropzone';
import ScanningAnimation from '../components/common/ScanningAnimation';
import VerificationResult from '../components/common/VerificationResult';
import { verifyAadhaar } from '../services/verification.service';
import toast from 'react-hot-toast';

const AadhaarVerification = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setResult(null);
    
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleVerify = async () => {
    if (!file) {
      toast.error('Please select a file to verify');
      return;
    }

    setVerifying(true);
    setUploadProgress(0);
    setResult(null);

    try {
      const response = await verifyAadhaar(file, (progress) => {
        setUploadProgress(progress);
      });

      if (response.success) {
        setResult(response.data);
        toast.success(`Verification ${response.data.status}`);
      } else {
        toast.error(response.message || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error(error.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setUploadProgress(0);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <FiFileText className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900">
              Aadhaar Card Verification
            </h1>
            <p className="text-gray-600">
              Upload your Aadhaar card to verify its authenticity
            </p>
          </div>
        </div>
      </motion.div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex items-start gap-3"
      >
        <FiInfo className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Verification includes:</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-700">
            <li>12-digit Aadhaar number validation with Verhoeff checksum</li>
            <li>QR code detection and data extraction</li>
            <li>OCR-based information extraction</li>
            <li>Cross-validation of QR data with printed information</li>
          </ul>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Upload Document
            </h2>

            <AnimatePresence mode="wait">
              {verifying ? (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-8 bg-white relative z-10"
                >
                  <ScanningAnimation text="Verifying Aadhaar card..." />
                </motion.div>
              ) : (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <FileDropzone
                    onFileSelect={handleFileSelect}
                    disabled={verifying}
                  />

                  {/* Preview */}
                  {preview && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6"
                    >
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
                      <div className="relative rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={preview}
                          alt="Document preview"
                          className="w-full max-h-64 object-contain bg-gray-50"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Actions */}
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={handleVerify}
                      disabled={!file || verifying}
                      className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
                    >
                      <FiUpload className="w-5 h-5" />
                      Verify Document
                    </button>
                    {(file || result) && (
                      <button
                        onClick={handleReset}
                        className="btn-secondary px-4"
                      >
                        <FiRefreshCw className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Guidelines */}
          <div className="mt-6 card bg-gray-50">
            <h3 className="font-medium text-gray-900 mb-3">Guidelines for best results:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Use a clear, well-lit photo of the document
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Ensure all text and QR code are visible
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Avoid glare and shadows on the document
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Upload the front side of the Aadhaar card
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Result Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <VerificationResult result={result} documentType="aadhaar" />
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="card bg-gray-50 h-full min-h-[400px] flex flex-col items-center justify-center text-center"
              >
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  <FiFileText className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  No verification result yet
                </h3>
                <p className="text-gray-500 text-sm max-w-xs">
                  Upload an Aadhaar card and click verify to see the results here
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default AadhaarVerification;
