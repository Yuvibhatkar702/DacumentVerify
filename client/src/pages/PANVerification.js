/**
 * PAN Card Verification Page
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCreditCard, FiUpload, FiRefreshCw, FiInfo } from 'react-icons/fi';
import FileDropzone from '../components/common/FileDropzone';
import ScanningAnimation from '../components/common/ScanningAnimation';
import VerificationResult from '../components/common/VerificationResult';
import { verifyPAN } from '../services/verification.service';
import toast from 'react-hot-toast';

const PANVerification = () => {
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
      const response = await verifyPAN(file, (progress) => {
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
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <FiCreditCard className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900">
              PAN Card Verification
            </h1>
            <p className="text-gray-600">
              Upload your PAN card to verify its authenticity
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
            <li>PAN format validation (^[A-Z]{5}[0-9]{4}[A-Z]$)</li>
            <li>Holder type identification (Individual, Company, etc.)</li>
            <li>Name and date of birth extraction</li>
            <li>Document authenticity indicators check</li>
          </ul>
        </div>
      </motion.div>

      {/* PAN Format Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-8"
      >
        <h3 className="font-medium text-gray-900 mb-2">PAN Format: AAAAA9999A</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
          <div className="bg-white rounded p-2">
            <span className="font-mono text-blue-600">AAA</span>
            <p className="text-gray-500 text-xs">Alphabetic series</p>
          </div>
          <div className="bg-white rounded p-2">
            <span className="font-mono text-green-600">A</span>
            <p className="text-gray-500 text-xs">Holder type</p>
          </div>
          <div className="bg-white rounded p-2">
            <span className="font-mono text-purple-600">A</span>
            <p className="text-gray-500 text-xs">Name initial</p>
          </div>
          <div className="bg-white rounded p-2">
            <span className="font-mono text-orange-600">9999</span>
            <p className="text-gray-500 text-xs">Sequential number</p>
          </div>
          <div className="bg-white rounded p-2">
            <span className="font-mono text-red-600">A</span>
            <p className="text-gray-500 text-xs">Check digit</p>
          </div>
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
                  className="py-8"
                >
                  <ScanningAnimation text="Verifying PAN card..." />
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
                Use a clear, well-lit photo of the PAN card
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Ensure the PAN number is clearly visible
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Include the full card in the image
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Avoid blurry or low-resolution images
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
                <VerificationResult result={result} documentType="pan" />
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
                  <FiCreditCard className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  No verification result yet
                </h3>
                <p className="text-gray-500 text-sm max-w-xs">
                  Upload a PAN card and click verify to see the results here
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default PANVerification;
