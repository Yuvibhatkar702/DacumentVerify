/**
 * Verdict Service
 *
 * Combines UIDAI sandbox KYC with existing QR/OCR extraction data
 * and returns final REAL/FAKE decision with confidence.
 */

const normalize = (value) => String(value || '').trim().toLowerCase();
const digitsOnly = (value) => String(value || '').replace(/\D/g, '');

const compareText = (a, b) => {
  const x = normalize(a);
  const y = normalize(b);

  if (!x || !y) {
    return { comparable: false, matched: false };
  }

  // For address-like fields, allow containment because OCR/QR often truncates.
  const matched = x === y || x.includes(y) || y.includes(x);
  return { comparable: true, matched };
};

/**
 * Compute final verdict from sandbox KYC + QR/OCR data.
 *
 * @param {Object} params
 * @param {Object} params.sandboxKyc - { name, dob, gender, address }
 * @param {Object|null} params.qrData - extracted QR fields
 * @param {Object|null} params.ocrData - extracted OCR fields
 * @param {string|null} params.aadhaarNumber - aadhaar used for OTP
 * @returns {{ status: 'REAL'|'FAKE', confidence: number, reason: string, details: object }}
 */
const getFinalVerdict = ({ sandboxKyc, qrData, ocrData, aadhaarNumber }) => {
  const evidence = [];
  const details = {
    sandboxAvailable: Boolean(sandboxKyc),
    qrAvailable: Boolean(qrData),
    ocrAvailable: Boolean(ocrData)
  };

  if (!sandboxKyc) {
    return {
      status: 'FAKE',
      confidence: 25,
      reason: 'Sandbox KYC unavailable, unable to establish identity trust',
      details
    };
  }

  const compareAgainst = [];
  if (qrData) compareAgainst.push({ source: 'qr', data: qrData });
  if (ocrData) compareAgainst.push({ source: 'ocr', data: ocrData });

  let comparedFields = 0;
  let matchedFields = 0;

  for (const source of compareAgainst) {
    const nameCmp = compareText(sandboxKyc.name, source.data?.name);
    const dobCmp = compareText(sandboxKyc.dob, source.data?.dob || source.data?.dateOfBirth);
    const genderCmp = compareText(sandboxKyc.gender, source.data?.gender);
    const addressCmp = compareText(sandboxKyc.address, source.data?.address);

    const checks = [
      { field: 'name', ...nameCmp },
      { field: 'dob', ...dobCmp },
      { field: 'gender', ...genderCmp },
      { field: 'address', ...addressCmp }
    ];

    checks.forEach((check) => {
      if (!check.comparable) {
        return;
      }

      comparedFields += 1;
      if (check.matched) {
        matchedFields += 1;
        evidence.push(`${source.source}:${check.field}:match`);
      } else {
        evidence.push(`${source.source}:${check.field}:mismatch`);
      }
    });
  }

  // Aadhaar number consistency check if available in QR/OCR.
  const expectedAadhaar = digitsOnly(aadhaarNumber);
  const qrAadhaar = digitsOnly(qrData?.aadhaarNumber);
  const ocrAadhaar = digitsOnly(ocrData?.aadhaarNumber);

  if (expectedAadhaar && qrAadhaar) {
    comparedFields += 1;
    if (expectedAadhaar === qrAadhaar) {
      matchedFields += 1;
      evidence.push('qr:aadhaar:match');
    } else {
      evidence.push('qr:aadhaar:mismatch');
    }
  }
  if (expectedAadhaar && ocrAadhaar) {
    comparedFields += 1;
    if (expectedAadhaar === ocrAadhaar) {
      matchedFields += 1;
      evidence.push('ocr:aadhaar:match');
    } else {
      evidence.push('ocr:aadhaar:mismatch');
    }
  }

  const confidence = comparedFields > 0
    ? Math.max(35, Math.min(99, Math.round((matchedFields / comparedFields) * 100)))
    : 60;

  const mismatchCount = evidence.filter((item) => item.endsWith('mismatch')).length;
  const status = mismatchCount >= 2 ? 'FAKE' : 'REAL';

  return {
    status,
    confidence,
    reason: status === 'REAL'
      ? 'Sandbox KYC and extracted document fields are consistent'
      : 'Multiple mismatches found between sandbox KYC and extracted document fields',
    details: {
      comparedFields,
      matchedFields,
      mismatchCount,
      evidence
    }
  };
};

module.exports = {
  getFinalVerdict
};
