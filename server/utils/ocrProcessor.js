/**
 * OCR processor utilities focused on Aadhaar number extraction.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { extractTextFromImage } = require('./ocr.util');
const { validateAadhaarChecksum } = require('./aadhaarVerification.util');

const KEYWORD_REGEX = /aadhaar|aadhar|uid/i;
const VID_REGEX = /\bvid\b/i;

const sanitizeDigits = (value) => (value ? String(value).replace(/\D/g, '') : '');

const preprocessForNumberOCR = async (imagePath, suffix) => {
  const ext = path.extname(imagePath) || '.png';
  const outputPath = imagePath.replace(ext, `${suffix}.png`);

  await sharp(imagePath)
    .resize({ width: 1900, withoutEnlargement: false })
    .grayscale()
    .normalize()
    .linear(1.55, -35)
    .threshold(145)
    .sharpen()
    .png()
    .toFile(outputPath);

  return outputPath;
};

const buildBottomRegion = async (imagePath) => {
  const ext = path.extname(imagePath) || '.png';
  const outputPath = imagePath.replace(ext, '_bottom_region.png');
  const meta = await sharp(imagePath).metadata();
  const width = meta.width || 1200;
  const height = meta.height || 700;

  const top = Math.max(0, Math.floor(height * 0.58));
  const cropHeight = Math.max(120, height - top);

  await sharp(imagePath)
    .extract({ left: 0, top, width, height: cropHeight })
    .resize({ width: 1900, withoutEnlargement: false, kernel: sharp.kernel.nearest })
    .grayscale()
    .normalize()
    .linear(1.6, -38)
    .threshold(142)
    .sharpen()
    .png()
    .toFile(outputPath);

  return outputPath;
};

const collectCandidates = (text = '', source = 'full') => {
  const candidates = [];
  const patterns = [
    /\b(\d{4}[-\s]?\d{4}[-\s]?\d{4})\b/g,
    /\b(\d{12})\b/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const raw = match[1] || match[0];
      const digits = sanitizeDigits(raw);

      if (digits.length !== 12) continue;
      if (digits.startsWith('0') || digits.startsWith('1')) continue;

      const start = Math.max(0, match.index - 30);
      const end = Math.min(text.length, match.index + raw.length + 30);
      const context = text.slice(start, end);

      let score = 0;
      if (validateAadhaarChecksum(digits)) score += 15;
      if (KEYWORD_REGEX.test(context)) score += 5;
      if (VID_REGEX.test(context)) score -= 8;
      if (source === 'bottom') score += 4;
      if (raw.includes(' ') || raw.includes('-')) score += 1;

      candidates.push({ digits, score, source, context: context.trim() });
    }
  }

  return candidates;
};

const pickBestCandidate = (candidates = []) => {
  if (!candidates.length) return null;

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].digits;
};

const cleanupFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    // Ignore cleanup errors.
  }
};

const extractAadhaarNumberFromImage = async (imagePath, fallbackText = '') => {
  let processedFull = null;
  let processedBottom = null;

  try {
    processedFull = await preprocessForNumberOCR(imagePath, '_aadhaar_num');
    processedBottom = await buildBottomRegion(imagePath);

    const [fullOCR, bottomOCR] = await Promise.all([
      extractTextFromImage(processedFull, { preprocess: false, lang: 'eng' }),
      extractTextFromImage(processedBottom, { preprocess: false, lang: 'eng' })
    ]);

    const candidates = [
      ...collectCandidates(fullOCR.success ? fullOCR.text : '', 'full'),
      ...collectCandidates(bottomOCR.success ? bottomOCR.text : '', 'bottom'),
      ...collectCandidates(fallbackText || '', 'full')
    ];

    return pickBestCandidate(candidates);
  } catch (error) {
    return pickBestCandidate(collectCandidates(fallbackText || '', 'full'));
  } finally {
    cleanupFile(processedFull);
    cleanupFile(processedBottom);
  }
};

module.exports = {
  extractAadhaarNumberFromImage,
  collectCandidates
};
