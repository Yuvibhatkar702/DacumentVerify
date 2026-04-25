/**
 * PAN Verification Controller
 * Handles OCR-based PAN card extraction and validation.
 */

const fs = require('fs');
const { extractTextFromImage } = require('../utils/ocr.util');

const PAN_REGEX = /\b([A-Z]{5}[0-9]{4}[A-Z])\b/;

const HOLDER_TYPE_MAP = {
  A: 'Association of Persons (AOP)',
  B: 'Body of Individuals (BOI)',
  C: 'Company',
  F: 'Firm',
  G: 'Government',
  H: 'Hindu Undivided Family (HUF)',
  J: 'Artificial Juridical Person',
  L: 'Local Authority',
  P: 'Individual',
  T: 'Trust'
};

const OCR_LETTER_FIXES = {
  '0': 'O',
  '1': 'I',
  '2': 'Z',
  '5': 'S',
  '8': 'B'
};

const OCR_DIGIT_FIXES = {
  O: '0',
  Q: '0',
  D: '0',
  I: '1',
  L: '1',
  S: '5',
  B: '8',
  Z: '2'
};

const cleanLines = (text) =>
  String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const normalizeDate = (value) => {
  if (!value) return null;
  const raw = String(value).trim();

  const ddmmyyyy = raw.match(/\b(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})\b/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[1]}/${ddmmyyyy[2]}/${ddmmyyyy[3]}`;
  }

  return null;
};

const extractPanNumber = (text) => {
  const upper = String(text || '').toUpperCase();

  const normalizeCandidate = (candidate) => {
    if (!candidate || candidate.length !== 10) return null;

    const chars = candidate.split('');

    // PAN positions 1-5 and 10 must be letters.
    [0, 1, 2, 3, 4, 9].forEach((idx) => {
      chars[idx] = OCR_LETTER_FIXES[chars[idx]] || chars[idx];
    });

    // PAN positions 6-9 must be digits.
    [5, 6, 7, 8].forEach((idx) => {
      chars[idx] = OCR_DIGIT_FIXES[chars[idx]] || chars[idx];
    });

    return chars.join('');
  };

  const bucket = new Set();

  // Strict direct pattern first.
  const strictMatch = upper.match(PAN_REGEX);
  if (strictMatch?.[1]) {
    return strictMatch[1];
  }

  // Fallback for OCR noise: pick 10-char alpha-numeric chunks and normalize.
  const chunks = upper.replace(/[^A-Z0-9]/g, ' ').split(/\s+/).filter(Boolean);
  for (const token of chunks) {
    if (token.length < 10) continue;

    for (let i = 0; i <= token.length - 10; i += 1) {
      const raw = token.slice(i, i + 10);
      const normalized = normalizeCandidate(raw);
      if (!normalized) continue;
      if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(normalized)) {
        bucket.add(normalized);
      }
    }
  }

  return bucket.size ? [...bucket][0] : null;
};

const extractDob = (text) => {
  const upper = String(text || '').toUpperCase();
  const labelled = upper.match(/(?:DOB|DATE OF BIRTH|BIRTH)\s*[:\-]?\s*(\d{2}[\/\-.]\d{2}[\/\-.]\d{4})/i);
  if (labelled && labelled[1]) {
    return normalizeDate(labelled[1]);
  }

  const anyDate = upper.match(/\b\d{2}[\/\-.]\d{2}[\/\-.]\d{4}\b/);
  return anyDate ? normalizeDate(anyDate[0]) : null;
};

const extractName = (text) => {
  const lines = cleanLines(text);
  const blacklist = [
    'INCOME TAX',
    'DEPARTMENT',
    'GOVT',
    'GOVERNMENT',
    'PERMANENT ACCOUNT',
    'DATE OF BIRTH',
    'DOB',
    'FATHER',
    'SIGNATURE',
    'SAMPLE',
    'DEMO',
    'TEST'
  ];

  const cleanName = (value) =>
    String(value || '')
      .toUpperCase()
      .replace(/[^A-Z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const isNoisyToken = (value) => {
    const v = String(value || '');
    // Reject obvious OCR junk like repeated letters (RRR) or very short tail words.
    return /(.)\1\1/.test(v) || /\b[A-Z]\b/.test(v);
  };

  const isCandidateName = (value) => {
    const name = cleanName(value);
    if (!name) return false;
    if (name.length < 8 || name.length > 50) return false;
    if (blacklist.some((word) => name.includes(word))) return false;
    if (PAN_REGEX.test(name)) return false;
    if (isNoisyToken(name)) return false;

    const words = name.split(' ').filter(Boolean);
    if (words.length < 2 || words.length > 5) return false;

    // At least two words with 2+ letters each to avoid garbage like "RRR A".
    const strongWords = words.filter((w) => w.length >= 2);
    return strongWords.length >= 2;
  };

  const scoreName = (name, context = {}) => {
    if (!isCandidateName(name)) return -100;

    const words = name.split(' ').filter(Boolean);
    let score = 0;

    if (words.length >= 2 && words.length <= 4) score += 6;
    if (name.length >= 10 && name.length <= 35) score += 5;
    if (context.fromLabel) score += 8;
    if (context.nearPan) score += 6;
    if (context.beforeFather) score += 5;
    if (/(.)\1\1/.test(name)) score -= 8;

    return score;
  };

  const candidates = [];
  const addCandidate = (raw, context = {}) => {
    const normalized = cleanName(raw);
    if (!normalized) return;
    const score = scoreName(normalized, context);
    if (score > -100) {
      candidates.push({ name: normalized, score });
    }
  };

  // 1) Label-based extraction (most reliable on PAN).
  for (let i = 0; i < lines.length; i += 1) {
    const lineUpper = lines[i].toUpperCase();

    const inline = lineUpper.match(/(?:^|\b)NAME(?:\b|\s*[:\-])\s*([A-Z\s]{3,})/);
    if (inline?.[1]) {
      addCandidate(inline[1], { fromLabel: true });
    }

    // Pattern where English/Hindi label appears after actual name: "XYZ / NAME".
    const beforeLabel = lineUpper.match(/^([A-Z\s]{5,})\s*\/\s*(?:NAME|NAM[E3])\b/);
    if (beforeLabel?.[1]) {
      addCandidate(beforeLabel[1], { fromLabel: true });
    }

    // Pattern where raw line contains "/Name" in mixed script OCR.
    if (/\/(?:\s*)NAME\b/.test(lineUpper)) {
      const lhs = lineUpper.split('/')[0];
      addCandidate(lhs, { fromLabel: true });
    }

    if (/\bNAME\b/.test(lineUpper) && i + 1 < lines.length) {
      const next = cleanName(lines[i + 1]);
      addCandidate(next, { fromLabel: true });

      // On many PAN cards, father's name follows holder name.
      if (i > 0) {
        addCandidate(lines[i - 1], { fromLabel: true });
      }
    }
  }

  // 1b) Use "Father's Name" marker: holder name is often one line above it.
  const fatherIndex = lines.findIndex((line) => /FATHER|FATHERS|FATHER'S|S\/O|D\/O/i.test(line));
  if (fatherIndex > 0) {
    addCandidate(lines[fatherIndex - 1], { beforeFather: true });
  }

  // 2) If PAN number line exists, prefer nearby previous line as name.
  const panLineIndex = lines.findIndex((line) => PAN_REGEX.test(line.toUpperCase()));
  if (panLineIndex > 0) {
    for (let i = panLineIndex - 1; i >= 0 && i >= panLineIndex - 3; i -= 1) {
      addCandidate(lines[i], { nearPan: true });
    }
  }

  for (const line of lines) {
    addCandidate(line);
  }

  if (!candidates.length) {
    return null;
  }

  // Deduplicate and choose highest score candidate.
  const deduped = new Map();
  for (const item of candidates) {
    const existing = deduped.get(item.name);
    if (!existing || item.score > existing.score) {
      deduped.set(item.name, item);
    }
  }

  const best = [...deduped.values()].sort((a, b) => b.score - a.score)[0];
  return best?.name || null;
};

const isLikelyFakePan = ({ rawText, panNumber, name }) => {
  const text = String(rawText || '').toUpperCase();
  const personName = String(name || '').toUpperCase();

  const fakeKeywords = ['SAMPLE', 'DEMO', 'TEST', 'DUMMY', 'NOT VALID'];
  if (fakeKeywords.some((word) => text.includes(word) || personName.includes(word))) {
    return true;
  }

  if (panNumber && !HOLDER_TYPE_MAP[panNumber[3]]) {
    return true;
  }

  return false;
};

const getHolderType = (panNumber) => {
  if (!panNumber || panNumber.length !== 10) return 'Unknown';
  const code = panNumber[3];
  return HOLDER_TYPE_MAP[code] || 'Unknown';
};

const computeConfidence = ({ ocrConfidence, hasPan, hasName, hasDob, isValid }) => {
  let score = Math.round((Number(ocrConfidence) || 0) * 0.5);
  if (hasPan) score += 25;
  if (hasName) score += 12;
  if (hasDob) score += 8;
  if (isValid) score += 5;
  return Math.max(0, Math.min(100, score));
};

const verifyPanCard = async (req, res) => {
  let tempFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a PAN card image file'
      });
    }

    tempFilePath = req.file.path;

    // OCR utility already applies preprocessing (resize, grayscale, contrast/normalize) before recognition.
    const ocr = await extractTextFromImage(tempFilePath, { preprocess: true, lang: 'eng' });

    if (!ocr.success) {
      return res.status(500).json({
        success: false,
        message: 'OCR failed while reading PAN card',
        error: ocr.error
      });
    }

    const rawText = String(ocr.text || '');
    const panNumber = extractPanNumber(rawText);
    const name = extractName(rawText);
    const dob = extractDob(rawText);
    const isRegexValid = panNumber ? /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber) : false;
    const holderType = isRegexValid ? getHolderType(panNumber) : 'Unknown';
    const fakeDetected = isLikelyFakePan({ rawText, panNumber, name });
    const isValid = Boolean(isRegexValid && holderType !== 'Unknown' && !fakeDetected);

    const confidenceScore = computeConfidence({
      ocrConfidence: ocr.confidence,
      hasPan: Boolean(panNumber),
      hasName: Boolean(name),
      hasDob: Boolean(dob),
      isValid
    });

    const validationMessages = [];
    if (!panNumber) validationMessages.push('PAN number could not be extracted');
    if (panNumber && !isRegexValid) validationMessages.push('PAN does not match standard format');
    if (holderType === 'Unknown') validationMessages.push('Invalid PAN holder type code (4th character)');
    if (!name) validationMessages.push('Name could not be extracted with confidence');
    if (fakeDetected) validationMessages.push('Likely fake/sample PAN detected');

    return res.status(200).json({
      success: true,
      data: {
        isValid,
        panNumber,
        holderType,
        name,
        dob,
        confidenceScore,
        status: isValid ? 'verified' : 'rejected',
        validationMessages
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'PAN verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
};

module.exports = {
  verifyPanCard
};
