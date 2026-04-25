/**
 * Aadhaar Sandbox Verification Component
 *
 * Educational UI flow:
 * 1) Enter Aadhaar number and request OTP
 * 2) Enter OTP and verify
 * 3) Display parsed KYC fields
 */

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { sendAadhaarOtp, verifyAadhaarOtp } from '../services/aadhaarSandbox.service';

const AadhaarSandboxVerification = () => {
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [otp, setOtp] = useState('');
  const [mode, setMode] = useState('');
  const [kycData, setKycData] = useState(null);
  const [finalStatus, setFinalStatus] = useState('');
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);

  const onSendOtp = async () => {
    const cleaned = aadhaarNumber.replace(/\D/g, '');

    if (cleaned.length !== 12) {
      toast.error('Please enter a valid 12-digit Aadhaar number');
      return;
    }

    try {
      setLoadingSend(true);
      setKycData(null);
      setFinalStatus('');

      const payload = { aadhaarNumber: cleaned };
      console.log('[AadhaarSandbox][UI][send-otp] request payload:', payload);
      const response = await sendAadhaarOtp(cleaned);
      console.log('[AadhaarSandbox][UI][send-otp] response:', response);
      setReferenceId(response.referenceId || '');
      setMode(response.mode || 'mock');

      toast.success(response.message || 'OTP sent successfully');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoadingSend(false);
    }
  };

  const onVerifyOtp = async () => {
    if (!referenceId.trim()) {
      toast.error('referenceId is required');
      return;
    }

    if (!otp.trim()) {
      toast.error('OTP is required');
      return;
    }

    try {
      setLoadingVerify(true);
      console.log('[AadhaarSandbox][UI][verify-otp] request payload:', {
        referenceId: referenceId.trim(),
        otp: otp.trim()
      });
      const response = await verifyAadhaarOtp(referenceId.trim(), otp.trim());
      console.log('[AadhaarSandbox][UI][verify-otp] response:', response);

      setMode(response.mode || mode);
      setKycData(response.kyc || null);
      setFinalStatus(response.finalStatus || '');

      toast.success('OTP verified successfully');
    } catch (error) {
      setKycData(null);
      setFinalStatus('');
      toast.error(error?.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoadingVerify(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Aadhaar Sandbox OTP Verification</h2>
      <p className="text-sm text-gray-600 mb-6">
        Enter Aadhaar, request OTP, then verify OTP to fetch KYC details.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number</label>
          <input
            value={aadhaarNumber}
            onChange={(e) => setAadhaarNumber(e.target.value)}
            placeholder="Enter 12-digit Aadhaar"
            maxLength={14}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={onSendOtp}
            disabled={loadingSend}
            className="w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {loadingSend ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Reference ID</label>
          <input
            value={referenceId}
            onChange={(e) => setReferenceId(e.target.value)}
            placeholder="referenceId from send-otp"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">OTP</label>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            maxLength={6}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onVerifyOtp}
        disabled={loadingVerify}
        className="w-full bg-emerald-600 text-white rounded-lg px-4 py-2.5 font-semibold hover:bg-emerald-700 disabled:opacity-60"
      >
        {loadingVerify ? 'Verifying OTP...' : 'Verify OTP'}
      </button>

      {mode ? (
        <div className="mt-5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
          Current backend mode: {mode}
        </div>
      ) : null}

      {kycData ? (
        <div className="mt-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Verified KYC Data</h3>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-700 uppercase">
              {mode || 'mock'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div><span className="font-semibold">Name:</span> {kycData.name || 'N/A'}</div>
            <div><span className="font-semibold">DOB:</span> {kycData.dob || 'N/A'}</div>
            <div><span className="font-semibold">Gender:</span> {kycData.gender || 'N/A'}</div>
            <div><span className="font-semibold">Address:</span> {kycData.address || 'N/A'}</div>
          </div>

          {finalStatus ? (
            <div className="mt-4 text-sm">
              <span className="font-semibold">Final Verdict:</span>{' '}
              <span className={finalStatus === 'REAL' ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                {finalStatus}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default AadhaarSandboxVerification;
