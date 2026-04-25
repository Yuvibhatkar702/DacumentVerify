/**
 * OCR fallback verification when Aadhaar QR is not available.
 */

const { validateAadhaarChecksum } = require('./aadhaarVerification.util');

const KNOWN_BLACKLISTED_AADHAAR = new Set([
  '209470519541'
]);

const sanitizeAadhaar = (value) => (value ? String(value).replace(/\D/g, '') : '');

const hasUsableValue = (value) => {
  if (value === null || value === undefined) return false;
  const normalized = String(value).trim();
  if (!normalized) return false;
  return normalized.toLowerCase() !== 'not extracted';
};

const extractAadhaarFromRawText = (rawText) => {
  if (!rawText) return '';

  const matches = rawText.match(/\b\d{4}\s?\d{4}\s?\d{4}\b/g) || [];
  for (const candidate of matches) {
    const digits = sanitizeAadhaar(candidate);
    if (digits.length !== 12) continue;
    if (digits.startsWith('0') || digits.startsWith('1')) continue;
    if (!validateAadhaarChecksum(digits)) continue;
    if (KNOWN_BLACKLISTED_AADHAAR.has(digits)) continue;
    return digits;
  }

  return '';
};

const verifyWithOcrFallback = (ocrData = {}, rawText = '') => {
  const aadhaarNumber = sanitizeAadhaar(ocrData.aadhaarNumber) || extractAadhaarFromRawText(rawText);
  const name = ocrData.name;
  const dob = ocrData.dob;

  const formatValid = /^\d{12}$/.test(aadhaarNumber) && !aadhaarNumber.startsWith('0') && !aadhaarNumber.startsWith('1');
  const checksumValid = formatValid && validateAadhaarChecksum(aadhaarNumber);
  const blacklisted = KNOWN_BLACKLISTED_AADHAAR.has(aadhaarNumber);
  const numberValid = formatValid && checksumValid && !blacklisted;

  const nameExtracted = hasUsableValue(name);
  const dobExtracted = hasUsableValue(dob);
  const nameMismatch = !nameExtracted;

  const realViaOCR = numberValid && nameExtracted && dobExtracted && formatValid;

  const status = realViaOCR
    ? 'verified'
    : ((numberValid || formatValid) ? 'suspicious' : 'rejected');

  const confidenceScore = realViaOCR ? 85 : (numberValid ? 55 : 30);

  const message = realViaOCR
    ? 'QR not readable, but document verified via OCR + checksum'
    : 'QR missing and OCR checks are incomplete';

  return {
    status,
    confidenceScore,
    message,
    checks: {
      formatValid,
      checksumValid,
      numberValid,
      blacklisted,
      nameExtracted,
      dobExtracted,
      nameMismatch,
      qrFound: false,
      qrDataMatches: false,
      ocrFallbackUsed: true
    }
  };
};

module.exports = {
  verifyWithOcrFallback,
  KNOWN_BLACKLISTED_AADHAAR
};
