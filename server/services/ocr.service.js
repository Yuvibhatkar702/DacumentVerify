/**
 * OCR Service
 * Extract Aadhaar data from printed text as fallback when QR is unavailable
 */

const { extractText, extractTextFromImage } = require('../utils/ocr.util');
const { extractAadhaarNumberFromImage } = require('../utils/ocrProcessor');

const normalizeSpace = (value) => (value ? value.replace(/\s+/g, ' ').trim() : null);

const normalizeDate = (value) => {
  if (!value) return null;
  const cleaned = value.replace(/-/g, '/').replace(/[.]/g, '/').trim();
  const match = cleaned.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  if (match) {
    return `${match[1]}/${match[2]}/${match[3]}`;
  }
  return cleaned;
};

const cleanNameCandidate = (candidate) => {
  if (!candidate) return null;

  const cleaned = candidate
    .replace(/[^A-Za-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 4) return null;

  const blocked = ['your', 'aadhaar', 'government', 'india', 'male', 'female', 'dob', 'birth', 'no'];
  let words = cleaned.toLowerCase().split(' ');

  if (words.some((word) => blocked.includes(word))) return null;
  if (words.length < 2 || words.length > 5) return null;

  // Remove trailing OCR noise token like "zg" if name already has >=2 words.
  if (words.length >= 3 && words[words.length - 1].length <= 2) {
    words = words.slice(0, -1);
  }

  if (words.length < 2) return null;

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const extractAadhaarNumber = (text) => {
  const patterns = [
    /\b(\d{4}\s\d{4}\s\d{4})\b/g,
    /\b(\d{12})\b/g
  ];

  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (!matches) continue;

    for (const match of matches) {
      const digits = match.replace(/\D/g, '');
      if (digits.length === 12 && !digits.startsWith('0') && !digits.startsWith('1')) {
        return digits;
      }
    }
  }

  return null;
};

const extractDob = (text) => {
  const patterns = [
    /\b(\d{2}[/-]\d{2}[/-]\d{4})\b/,
    /(?:DOB|Date\s*of\s*Birth|Birth)\s*[:\-]?\s*([\d/\-]{4,10})/i,
    /(?:DOB|Date\s*of\s*Birth|Birth)\s*[:\-]?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return normalizeDate(normalizeSpace(match[1]));
    }
  }

  return null;
};

const extractGender = (text) => {
  const upper = text.toUpperCase();

  const femaleCount = (upper.match(/\bFEMALE\b/g) || []).length;
  const maleCount = (upper.match(/\bMALE\b/g) || []).length;
  const otherCount = (upper.match(/\bOTHER\b/g) || []).length;

  if (otherCount > 0) return 'Other';
  if (maleCount > femaleCount) return 'Male';
  if (femaleCount > maleCount) return 'Female';

  // Tie-breaker near DOB line on Aadhaar front side.
  const lines = text.split('\n');
  for (const line of lines) {
    if (/DOB|Date\s*of\s*Birth|Birth/i.test(line) && /MALE/i.test(line)) {
      return 'Male';
    }
    if (/DOB|Date\s*of\s*Birth|Birth/i.test(line) && /FEMALE/i.test(line)) {
      return 'Female';
    }
  }

  if (/\bM\b/.test(upper)) return 'Male';
  if (/\bF\b/.test(upper)) return 'Female';

  return null;
};

const extractName = (rawText) => {
  const lines = rawText
    .split('\n')
    .map((line) => normalizeSpace(line))
    .filter(Boolean);

  // Prefer line before DOB line.
  for (let i = 0; i < lines.length; i += 1) {
    const current = lines[i];
    const next = lines[i + 1] || '';

    if (/DOB|Date\s*of\s*Birth|Birth/i.test(next)) {
      const candidate = cleanNameCandidate(current);
      if (candidate) return candidate;
    }
  }

  // Same-line pattern: <Name> DOB: <date>
  for (const line of lines) {
    const match = line.match(/^([A-Za-z][A-Za-z\s]{4,40})\s+(?:DOB|Date\s*of\s*Birth|Birth)[:\s]/i);
    if (match && match[1]) {
      const candidate = cleanNameCandidate(match[1]);
      if (candidate) return candidate;
    }
  }

  // Try labeled name lines.
  for (const line of lines) {
    const labeled = line.match(/(?:Name|नाम)\s*[:\-]?\s*(.+)$/i);
    if (labeled && labeled[1]) {
      const candidate = cleanNameCandidate(labeled[1]);
      if (candidate) return candidate;
    }
  }

  // Generic title-case line fallback.
  for (const line of lines) {
    const candidate = cleanNameCandidate(line);
    if (candidate) return candidate;
  }

  return null;
};

const extractAddress = (rawText) => {
  const oneLine = normalizeSpace(rawText.replace(/\n/g, ' '));
  const withLabel = oneLine.match(/(?:Address|पता)\s*[:\-]?\s*(.*?)(?=\b\d{6}\b|$)/i);
  if (withLabel && withLabel[1]) {
    const address = normalizeSpace(withLabel[1]);
    if (address && address.length > 12) {
      return address;
    }
  }

  return null;
};

const computeOCRConfidence = (ocrConfidence, extractedData) => {
  let score = 0;

  score += Math.min(30, Math.max(0, Math.round((ocrConfidence || 0) / 3.33)));

  if (extractedData.aadhaarNumber) score += 30;
  if (extractedData.name) score += 15;
  if (extractedData.dob) score += 10;
  if (extractedData.gender) score += 10;
  if (extractedData.address) score += 5;

  return Math.min(100, score);
};

const scoreCandidateText = (text) => {
  let score = 0;
  if (!text) return score;

  if (/\b\d{4}\s?\d{4}\s?\d{4}\b/.test(text)) score += 5;
  if (/\b\d{2}[/-]\d{2}[/-]\d{4}\b/.test(text)) score += 3;
  if (/\b(MALE|FEMALE|DOB|Date\s*of\s*Birth)\b/i.test(text)) score += 2;

  return score;
};

const runBestOcrPass = async (filePath) => {
  const passes = [];

  const passDefault = await extractText(filePath);
  if (passDefault.success) {
    passes.push(passDefault);
  }

  const passEng = await extractTextFromImage(filePath, { preprocess: true, lang: 'eng' });
  if (passEng.success) {
    passes.push(passEng);
  }

  const passEngOrig = await extractTextFromImage(filePath, { preprocess: false, lang: 'eng' });
  if (passEngOrig.success) {
    passes.push(passEngOrig);
  }

  if (!passes.length) {
    return {
      success: false,
      text: '',
      confidence: 0,
      error: 'All OCR passes failed'
    };
  }

  let best = passes[0];
  let bestScore = scoreCandidateText(best.text) + ((best.confidence || 0) / 20);

  for (let i = 1; i < passes.length; i += 1) {
    const candidate = passes[i];
    const score = scoreCandidateText(candidate.text) + ((candidate.confidence || 0) / 20);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
};

const runAadhaarOCR = async (filePath) => {
  const ocr = await runBestOcrPass(filePath);

  if (!ocr.success) {
    return {
      success: false,
      extractedData: null,
      rawText: '',
      confidenceScore: 0,
      message: ocr.error || 'OCR failed'
    };
  }

  const aadhaarNumberFromImage = await extractAadhaarNumberFromImage(filePath, ocr.text);

  const extractedData = {
    aadhaarNumber: aadhaarNumberFromImage || extractAadhaarNumber(ocr.text),
    name: extractName(ocr.text),
    dob: extractDob(ocr.text),
    gender: extractGender(ocr.text),
    address: extractAddress(ocr.text)
  };

  return {
    success: true,
    extractedData,
    rawText: ocr.text,
    confidenceScore: computeOCRConfidence(ocr.confidence, extractedData),
    message: 'OCR extraction completed'
  };
};

module.exports = {
  runAadhaarOCR
};
