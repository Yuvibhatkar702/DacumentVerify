/**
 * Verification Service
 * API calls for document verification
 */

import api from './api';

const VERIFICATION_TIMEOUT = Number(process.env.REACT_APP_VERIFICATION_TIMEOUT || 180000);

/**
 * Verify Aadhaar card
 * @param {File} file - The document file to verify
 * @param {Function} onProgress - Progress callback
 */
export const verifyAadhaar = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('document', file);
  
  const response = await api.post('/verify/aadhaar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: VERIFICATION_TIMEOUT,
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });
  
  return response.data;
};

/**
 * Verify PAN card
 * @param {File} file - The document file to verify
 * @param {Function} onProgress - Progress callback
 */
export const verifyPAN = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('document', file);
  
  const response = await api.post('/verify/pan', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: VERIFICATION_TIMEOUT,
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });
  
  return response.data;
};

/**
 * Get verification by ID
 * @param {string} id - Verification document ID
 */
export const getVerificationById = async (id) => {
  const response = await api.get(`/verify/${id}`);
  return response.data;
};

/**
 * Delete verification record
 * @param {string} id - Verification document ID
 */
export const deleteVerification = async (id) => {
  const response = await api.delete(`/verify/${id}`);
  return response.data;
};

/**
 * Get verification history
 * @param {Object} params - Query parameters
 */
export const getHistory = async (params = {}) => {
  const response = await api.get('/history', { params });
  return response.data;
};

/**
 * Get dashboard statistics
 */
export const getStats = async () => {
  const response = await api.get('/history/stats');
  return response.data;
};

/**
 * Get recent verifications
 * @param {number} limit - Number of records to fetch
 */
export const getRecent = async (limit = 5) => {
  const response = await api.get('/history/recent', { params: { limit } });
  return response.data;
};

const verificationService = {
  verifyAadhaar,
  verifyPAN,
  getVerificationById,
  deleteVerification,
  getHistory,
  getStats,
  getRecent
};

export default verificationService;
