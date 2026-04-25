/**
 * PAN Verification Component
 * Uploads PAN image and renders OCR-based verification result.
 */

import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiUpload, FiCheckCircle, FiXCircle, FiCreditCard, FiRefreshCw } from 'react-icons/fi';
import FileDropzone from './common/FileDropzone';
import { verifyPAN } from '../services/verification.service';

const ResultRow = ({ label, value }) => (
  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</p>
    <p className="text-sm font-semibold text-gray-900">{value || 'Not detected'}</p>
  </div>
);

const PanVerification = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isValid = Boolean(result?.isValid);

  const badgeClass = useMemo(
    () => (isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'),
    [isValid]
  );

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile || null);
    setResult(null);
    setUploadProgress(0);

    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => setPreview(event.target?.result || null);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleVerify = async () => {
    if (!file) {
      toast.error('Please select a PAN card image first');
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      setUploadProgress(0);

      const response = await verifyPAN(file, (progress) => {
        setUploadProgress(progress || 0);
      });

      if (!response?.success) {
        toast.error(response?.message || 'PAN verification failed');
        return;
      }

      setResult(response.data || null);
      toast.success(response.data?.isValid ? 'Valid PAN detected' : 'Invalid PAN detected');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'PAN verification failed. Please try again.');
    } finally {
      setLoading(false);
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
      <div className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
          <FiCreditCard className="w-6 h-6 text-blue-700" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">PAN Card Verification</h1>
          <p className="text-gray-600">Upload PAN card image and verify OCR extracted details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload PAN Card</h2>

          <FileDropzone onFileSelect={handleFileSelect} disabled={loading} />

          {preview ? (
            <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
              <img src={preview} alt="PAN preview" className="w-full max-h-64 object-contain bg-gray-50" />
            </div>
          ) : null}

          {loading ? (
            <div className="mt-4">
              <div className="h-2 bg-gray-200 rounded overflow-hidden">
                <div
                  className="h-2 bg-blue-600 transition-all"
                  style={{ width: `${Math.max(5, uploadProgress)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">Uploading and verifying... {uploadProgress}%</p>
            </div>
          ) : null}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleVerify}
              disabled={!file || loading}
              className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
            >
              <FiUpload className="w-5 h-5" />
              {loading ? 'Verifying...' : 'Verify PAN'}
            </button>

            <button type="button" onClick={handleReset} className="btn-secondary px-4" disabled={loading}>
              <FiRefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="card bg-gray-50 min-h-[320px]">
          {!result ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                <FiCreditCard className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-600 mb-2">No verification result yet</h3>
              <p className="text-sm text-gray-500">Upload PAN image and click Verify PAN.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Verification Result</h3>
                <span className={`text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1 ${badgeClass}`}>
                  {isValid ? <FiCheckCircle className="w-4 h-4" /> : <FiXCircle className="w-4 h-4" />}
                  {isValid ? 'Valid' : 'Invalid'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ResultRow label="PAN Number" value={result.panNumber} />
                <ResultRow label="Holder Type" value={result.holderType} />
                <ResultRow label="Name" value={result.name} />
                <ResultRow label="Date of Birth" value={result.dob} />
                <ResultRow label="Confidence Score" value={`${result.confidenceScore ?? 0}%`} />
              </div>

              {Array.isArray(result.validationMessages) && result.validationMessages.length > 0 ? (
                <div className="mt-4 p-3 rounded-lg border border-gray-200 bg-white">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Verification Notes</p>
                  <ul className="space-y-1 text-sm text-gray-700">
                    {result.validationMessages.map((msg, index) => (
                      <li key={`${msg}-${index}`} className="flex items-start gap-2">
                        <span className="text-gray-400">•</span>
                        <span>{msg}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PanVerification;
