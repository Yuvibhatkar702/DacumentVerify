/**
 * DocumentUpload Component
 * Unified Aadhaar verification UI with live QR/OCR status
 */

import React, { useState } from 'react';
import { FiUpload, FiRefreshCw, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';
import FileDropzone from './FileDropzone';

const StatusPill = ({ active, done, text }) => {
  const Icon = done ? FiCheckCircle : active ? FiClock : FiXCircle;

  return (
    <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
      done ? 'bg-green-100 text-green-700' : active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
    }`}>
      <Icon className="w-3.5 h-3.5" />
      {text}
    </div>
  );
};

const Field = ({ label, value }) => (
  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
    <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
    <div className="text-sm font-semibold text-gray-800 mt-1">{value || 'N/A'}</div>
  </div>
);

const Check = ({ label, value }) => (
  <div className="flex items-center gap-2 text-sm">
    {value ? (
      <FiCheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <FiXCircle className="w-4 h-4 text-red-500" />
    )}
    <span className="text-gray-700">{label}</span>
  </div>
);

const DocumentUpload = ({ documentType = 'aadhaar' }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('idle');
  const [result, setResult] = useState(null);

  const checks = result?.verificationChecks || {};
  const extracted = result?.extractedData || {};
  const qrExtracted = result?.qrExtractedData || {};
  const fallbackUsed = Boolean(checks.ocrFallbackUsed);

  let crossValidationText = 'N/A';
  if (result) {
    if (checks.qrFound && checks.qrDataMatches) {
      crossValidationText = 'QR data matches printed text';
    } else if (checks.qrFound && !checks.qrDataMatches) {
      crossValidationText = 'QR found, mismatch with printed text';
    } else if (result.verificationMessage) {
      crossValidationText = result.verificationMessage;
    } else {
      crossValidationText = 'Document evaluated using OCR checks';
    }
  }

  const onFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setResult(null);

    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => setPreview(event.target.result);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setLoading(false);
    setStage('idle');
    setResult(null);
  };

  const verifyDocument = async () => {
    if (!file) {
      toast.error('Please upload a file first');
      return;
    }

    try {
      setLoading(true);
      setStage('uploading');
      setResult(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      const response = await api.post('/verify/document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (event) => {
          const percent = Math.round((event.loaded * 100) / (event.total || 1));
          if (percent >= 100) {
            setStage('scanning-qr');
          }
        }
      });

      setStage('ocr-fallback');
      setResult(response.data);
      setStage('done');

      if (response.data.status === 'verified') {
        toast.success('Document verified successfully');
      } else if (response.data.status === 'suspicious') {
        toast('Document marked suspicious. Review details.', { icon: '⚠️' });
      } else {
        toast.error('Document validation failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed');
      setStage('idle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h2>

        <FileDropzone onFileSelect={onFileSelect} disabled={loading} />

        {preview && (
          <div className="mt-5">
            <div className="text-sm text-gray-600 mb-2">Preview</div>
            <div className="border rounded-lg overflow-hidden bg-gray-50">
              <img src={preview} alt="Preview" className="w-full max-h-64 object-contain" />
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <StatusPill active={stage === 'uploading'} done={['scanning-qr', 'ocr-fallback', 'done'].includes(stage)} text="Uploaded" />
          <StatusPill active={stage === 'scanning-qr'} done={['ocr-fallback', 'done'].includes(stage)} text="QR scanned" />
          <StatusPill active={stage === 'ocr-fallback'} done={stage === 'done'} text="OCR parsed" />
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={verifyDocument}
            disabled={!file || loading}
            className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
          >
            <FiUpload className="w-4 h-4" />
            {loading ? 'Verifying...' : 'Verify Document'}
          </button>
          <button onClick={reset} className="btn-secondary px-4" disabled={loading}>
            <FiRefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="card bg-white">
        {!result ? (
          <div className="h-full min-h-[360px] flex items-center justify-center text-center text-gray-500">
            Upload and verify a document to view extracted data
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Verification Result</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                result.status === 'verified' ? 'bg-green-100 text-green-700' :
                result.status === 'suspicious' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
              }`}>
                {result.status}
              </span>
            </div>

            <div className="mb-5">
              <div className="flex items-center justify-between text-sm text-gray-700 mb-1">
                <span>Confidence Score</span>
                <span className="font-bold">{result.confidenceScore}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-2 bg-green-500" style={{ width: `${result.confidenceScore}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              <Field label="Aadhaar Number" value={extracted.aadhaarNumber} />
              <Field label="Name" value={extracted.name} />
              <Field label="DOB" value={extracted.dob} />
              <Field label="Gender" value={extracted.gender} />
              <div className="md:col-span-2">
                <Field label="Address" value={extracted.address} />
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <Check label="Number Valid" value={checks.numberValid} />
              <Check label="Format Valid" value={checks.formatValid} />
              <Check label="QR Found" value={checks.qrFound} />
              <Check label="QR Data Matches" value={checks.qrDataMatches} />
            </div>

            <div className="rounded-lg border border-green-100 bg-green-50 p-3 mb-4">
              <div className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
                {fallbackUsed ? 'OCR Extracted Data' : 'QR Extracted Data'}
              </div>
              {fallbackUsed ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="OCR Name" value={extracted.name} />
                  <Field label="OCR DOB" value={extracted.dob} />
                  <Field label="OCR Address" value={extracted.address} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="QR Name" value={qrExtracted.name} />
                  <Field label="QR Address" value={qrExtracted.address} />
                </div>
              )}
            </div>

            <div className="text-sm rounded-lg bg-blue-50 text-blue-700 px-3 py-2 border border-blue-100">
              {crossValidationText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUpload;
