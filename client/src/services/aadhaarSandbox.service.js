/**
 * Aadhaar Sandbox Service
 * Client API wrappers for OTP send/verify flow.
 */

import api from './api';

export const sendAadhaarOtp = async (aadhaarNumber) => {
  const response = await api.post('/aadhaar/send-otp', { aadhaarNumber });
  return response.data;
};

export const verifyAadhaarOtp = async (referenceId, otp) => {
  const response = await api.post('/aadhaar/verify-otp', {
    referenceId,
    otp
  });
  return response.data;
};

const aadhaarSandboxService = {
  sendAadhaarOtp,
  verifyAadhaarOtp
};

export default aadhaarSandboxService;
