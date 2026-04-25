/**
 * Aadhaar Sandbox Controller
 *
 * Educational implementation of OTP-based Aadhaar e-KYC.
 *
 * Endpoints:
 * - POST /api/aadhaar/send-otp   -> accepts { aadhaarNumber }
 * - POST /api/aadhaar/verify-otp -> accepts { referenceId, otp }
 */

const axios = require('axios');
const { getFinalVerdict } = require('../services/verdictService');

// In-memory storage of OTP sessions.
// Key: referenceId
// Value: { userId, aadhaarNumber, expiresAt }
const otpReferenceStore = new Map();
const REF_TTL_MS = 5 * 60 * 1000; // 5 minutes

const SANDBOX_BASE_URL = () => process.env.SANDBOX_BASE_URL || 'https://api.sandbox.co.in';

const cleanupExpiredReferences = () => {
  const now = Date.now();
  for (const [referenceId, value] of otpReferenceStore.entries()) {
    if (value.expiresAt <= now) {
      otpReferenceStore.delete(referenceId);
    }
  }
};

const maskAadhaar = (aadhaarNumber) => {
  const digits = String(aadhaarNumber || '').replace(/\D/g, '');
  if (digits.length !== 12) return null;
  return `XXXX XXXX ${digits.slice(-4)}`;
};

// Lightweight XML parsing for commonly returned e-KYC fields.
const parseAadhaarEKycXml = (xml) => {
  if (!xml || typeof xml !== 'string') {
    return null;
  }

  const getAttr = (name) => {
    const match = xml.match(new RegExp(`${name}="([^"]+)"`, 'i'));
    return match ? match[1].trim() : null;
  };

  const getTag = (tag) => {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
    return match ? match[1].trim() : null;
  };

  const name = getAttr('name') || getTag('Name');
  const dob = getAttr('dob') || getTag('DOB') || getTag('DateOfBirth');
  const gender = getAttr('gender') || getTag('Gender');
  const address =
    getAttr('address') ||
    getTag('Address') ||
    [
      getAttr('house'),
      getAttr('street'),
      getAttr('loc'),
      getAttr('vtc'),
      getAttr('dist'),
      getAttr('state'),
      getAttr('pc')
    ].filter(Boolean).join(', ');

  return {
    name: name || null,
    dob: dob || null,
    gender: gender || null,
    address: address || null
  };
};

const getSandboxHeaders = () => {
  const apiKey = process.env.SANDBOX_API_KEY;
  const apiSecret = process.env.SANDBOX_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('SANDBOX_API_KEY and SANDBOX_API_SECRET are required for real mode');
  }

  return {
    'x-api-key': apiKey,
    'x-api-secret': apiSecret,
    'Content-Type': 'application/json'
  };
};

const callSandboxGenerateOtp = async (aadhaarNumber) => {
  const response = await axios.post(
    `${SANDBOX_BASE_URL()}/kyc/aadhaar/okyc/otp`,
    {
      '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.otp.request',
      aadhaar_number: aadhaarNumber,
      consent: 'Y',
      reason: 'KYC verification'
    },
    {
      headers: getSandboxHeaders(),
      timeout: 20000
    }
  );

  return response.data;
};

const callSandboxVerifyOtp = async (referenceId, otp) => {
  const response = await axios.post(
    `${SANDBOX_BASE_URL()}/kyc/aadhaar/okyc/otp/verify`,
    {
      '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.request',
      reference_id: referenceId,
      otp: String(otp)
    },
    {
      headers: getSandboxHeaders(),
      timeout: 20000
    }
  );

  return response.data;
};

const generateAadhaarOTP = async (req, res) => {
  try {
    cleanupExpiredReferences();

    console.log('[AadhaarSandbox][send-otp] received body:', req.body);

    if (!req.body || typeof req.body.aadhaarNumber === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Request body must include aadhaarNumber'
      });
    }

    const aadhaarNumber = String(req.body?.aadhaarNumber || '').replace(/\D/g, '');
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      return res.status(400).json({
        success: false,
        message: 'aadhaarNumber must be a valid 12-digit number'
      });
    }

    const useMock = process.env.AADHAAR_TEST_MODE === 'true';
    let referenceId;

    if (useMock) {
      // As requested: fixed mock reference ID.
      referenceId = 'ref_123';
    } else {
      const sandboxResponse = await callSandboxGenerateOtp(aadhaarNumber);
      referenceId = sandboxResponse?.data?.reference_id;
    }

    if (!referenceId) {
      return res.status(502).json({
        success: false,
        message: 'Sandbox did not return a referenceId'
      });
    }

    otpReferenceStore.set(referenceId, {
      userId: req.user?.id || req.user?._id?.toString() || 'anonymous',
      aadhaarNumber,
      expiresAt: Date.now() + REF_TTL_MS
    });

    const successPayload = {
      success: true,
      referenceId,
      maskedAadhaar: useMock ? `xxxxxx${aadhaarNumber.slice(-4)}` : maskAadhaar(aadhaarNumber),
      mode: useMock ? 'mock' : 'real',
      expiresInSeconds: Math.floor(REF_TTL_MS / 1000),
      message: useMock ? 'Mock OTP generated. Use 123456 for verification.' : 'OTP sent to registered mobile'
    };

    console.log('[AadhaarSandbox][send-otp] response:', successPayload);
    return res.status(200).json(successPayload);
  } catch (error) {
    const upstreamStatus = error?.response?.status;
    const upstreamMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Unknown sandbox error';

    if (upstreamStatus === 400 || upstreamStatus === 401 || upstreamStatus === 403) {
      return res.status(400).json({
        success: false,
        message: upstreamMessage,
        error: upstreamMessage
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: upstreamMessage
    });
  }
};

const verifyAadhaarOTP = async (req, res) => {
  try {
    cleanupExpiredReferences();

    console.log('[AadhaarSandbox][verify-otp] received body:', req.body);

    const { otp, qrData, ocrData } = req.body || {};
    const referenceId = req.body?.reference_id || req.body?.referenceId;
    if (!referenceId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'referenceId and otp are required'
      });
    }

    const record = otpReferenceStore.get(String(referenceId));
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'referenceId expired or not found. Please send OTP again.'
      });
    }

    const currentUserId = req.user?.id || req.user?._id?.toString() || 'anonymous';
    if (record.userId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'referenceId does not belong to current user'
      });
    }

    const useMock = process.env.AADHAAR_TEST_MODE === 'true';
    let parsedKyc;
    let rawXml = null;

    if (useMock) {
      if (String(otp) !== '123456') {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP in mock mode. Use 123456.'
        });
      }

      parsedKyc = {
        name: 'Demo Aadhaar User',
        dob: '01/01/2000',
        gender: 'M',
        address: '12 Main Road, Andheri, Mumbai, Maharashtra, 400001'
      };
    } else {
      try {
        const sandboxResponse = await callSandboxVerifyOtp(referenceId, otp);
        const kycPayload = sandboxResponse?.data || {};

        parsedKyc = {
          name: kycPayload.name || null,
          dob: kycPayload.dob || null,
          gender: kycPayload.gender || null,
          address: kycPayload.address || null
        };

        rawXml = sandboxResponse?.ekyc_xml || sandboxResponse?.data?.ekyc_xml || sandboxResponse?.xml || null;

        // Fallback parser for XML-only payloads.
        if (!parsedKyc.name && !parsedKyc.dob && !parsedKyc.gender && !parsedKyc.address && rawXml) {
          parsedKyc = parseAadhaarEKycXml(rawXml || '');
        }

        if (!parsedKyc || (!parsedKyc.name && !parsedKyc.dob && !parsedKyc.gender && !parsedKyc.address)) {
          return res.status(400).json({
            success: false,
            message: 'Sandbox OTP verification failed or returned empty KYC data'
          });
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error?.response?.data?.message || 'OTP verification failed'
        });
      }
    }

    // OTP reference is one-time use.
    otpReferenceStore.delete(String(referenceId));

    const verdict = getFinalVerdict({
      sandboxKyc: parsedKyc,
      qrData: qrData || null,
      ocrData: ocrData || null,
      aadhaarNumber: record.aadhaarNumber
    });

    const successPayload = {
      success: true,
      referenceId: String(referenceId),
      mode: useMock ? 'mock' : 'real',
      kyc: parsedKyc,
      kycData: parsedKyc,
      finalStatus: verdict.status,
      verdictReason: verdict.reason,
      confidenceScore: verdict.confidence,
      rawXml
    };

    console.log('[AadhaarSandbox][verify-otp] response:', successPayload);
    return res.status(200).json(successPayload);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  generateAadhaarOTP,
  verifyAadhaarOTP,
  parseAadhaarEKycXml,
  otpReferenceStore
};
