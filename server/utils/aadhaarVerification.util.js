/**
 * Aadhaar Verification Utility
 * Validates Aadhaar card using OCR, QR code, and validation algorithms
 */

const { extractText, cleanText } = require('./ocr.util');
const { scanQRCode, parseAadhaarQRData } = require('./qrScanner.util');

/**
 * Aadhaar number validation using Verhoeff algorithm
 * The Verhoeff algorithm is used to validate Aadhaar numbers
 */
const verhoeffTable = {
  d: [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
  ],
  p: [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
  ],
  inv: [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]
};

/**
 * Validate Aadhaar number using Verhoeff checksum
 */
const validateAadhaarChecksum = (aadhaarNumber) => {
  const digits = aadhaarNumber.replace(/\D/g, '');
  
  if (digits.length !== 12) {
    return false;
  }
  
  let c = 0;
  const reversedDigits = digits.split('').reverse();
  
  for (let i = 0; i < reversedDigits.length; i++) {
    c = verhoeffTable.d[c][verhoeffTable.p[i % 8][parseInt(reversedDigits[i])]];
  }
  
  return c === 0;
};

/**
 * Extract Aadhaar number from text
 */
const extractAadhaarNumber = (text) => {
  // Pattern for Aadhaar: 12 digits, may have spaces
  const patterns = [
    /\b(\d{4}\s?\d{4}\s?\d{4})\b/g,
    /\b(\d{12})\b/g
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        const cleaned = match.replace(/\s/g, '');
        // Aadhaar numbers don't start with 0 or 1
        if (cleaned.length === 12 && !cleaned.startsWith('0') && !cleaned.startsWith('1')) {
          return cleaned;
        }
      }
    }
  }
  
  return null;
};

/**
 * Extract name from Aadhaar text
 * Enhanced to handle OCR noise and Aadhaar card formats
 */
const extractName = (text) => {
  if (!text) return null;
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
  
  // Words that should NOT be part of a name
  const excludeWords = [
    'male', 'female', 'other', 'government', 'india', 'uidai', 'aadhaar',
    'unique', 'identification', 'authority', 'dob', 'date', 'birth', 'year',
    'yob', 'address', 'vid', 'uid', 'help', 'download', 'mera', 'helpline',
    'enrolment', 'enrollment', 'of', 'the', 'to'
  ];
  
  // Common OCR garbage patterns
  const isGarbage = (word) => {
    if (!word || word.length < 2) return true;
    // Single/double letter noise like "Fn", "Yd"
    if (word.length <= 2 && !/^[A-Z][a-z]$/.test(word)) return true;
    // Repeated characters like "eee", "lll"
    if (/(.)\1{2,}/.test(word)) return true;
    // No vowels (likely garbage)
    if (word.length > 2 && !/[aeiouAEIOU]/.test(word)) return true;
    // Is excluded word
    if (excludeWords.includes(word.toLowerCase())) return true;
    return false;
  };
  
  // Clean and validate a potential name
  const cleanAndValidateName = (rawName) => {
    if (!rawName) return null;
    
    // Remove non-alphabetic characters and split into words
    const words = rawName
      .replace(/[^a-zA-Z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => !isGarbage(w) && w.length >= 2);
    
    // Need at least 2 valid words for a name
    if (words.length < 2) return null;
    
    // Capitalize properly
    const formatted = words
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    
    // Final validation
    if (formatted.length < 5 || formatted.length > 50) return null;
    
    return formatted;
  };
  
  // Priority 1: Find name on line BEFORE "Date of Birth" or "DOB" line
  for (let i = 0; i < lines.length; i++) {
    const nextLine = lines[i + 1] || '';
    
    // If next line contains DOB pattern, current line is likely the name
    if (/(?:Date\s*of\s*Birth|DOB|D\.O\.B)[\/:\s]*\d{2}[\/\-]\d{2}[\/\-]\d{4}/i.test(nextLine) ||
        /(?:DOB|D\.O\.B)[:\s]*\d{2}[\/\-]\d{2}[\/\-]\d{4}/i.test(nextLine)) {
      const line = lines[i];
      // Skip if line has numbers or is clearly not a name
      if (!/\d/.test(line) && !/(?:government|india|aadhaar|female|male)/i.test(line)) {
        const name = cleanAndValidateName(line);
        if (name) return name;
      }
    }
  }
  
  // Priority 2: Find name on same line as DOB (before the DOB text)
  const sameLine = text.match(/([A-Za-z][A-Za-z\s]{3,40}?)\s*(?:Date\s*of\s*Birth|DOB)[\/:\s]*\d{2}/i);
  if (sameLine) {
    const name = cleanAndValidateName(sameLine[1]);
    if (name) return name;
  }
  
  // Priority 3: Look for explicit name labels
  const namePatterns = [
    /(?:name|नाम)\s*[:\-]?\s*([A-Za-z][A-Za-z\s]{3,40})/i,
    /(?:To|TO)\s*[,:]?\s*([A-Za-z][A-Za-z\s]{3,40})/i,
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const name = cleanAndValidateName(match[1]);
      if (name) return name;
    }
  }
  
  // Priority 4: Find line that looks like a proper name (2-4 capitalized words)
  for (const line of lines) {
    // Skip lines with numbers or common non-name text
    if (/\d/.test(line)) continue;
    if (/(?:government|india|aadhaar|uidai|female|male|dob|birth|address|unique)/i.test(line)) continue;
    
    // Check if line has 2-4 words that look like names
    const words = line.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/);
    if (words.length >= 2 && words.length <= 4) {
      const allValidWords = words.every(w => !isGarbage(w));
      if (allValidWords) {
        const name = cleanAndValidateName(line);
        if (name) return name;
      }
    }
  }
  
  // Priority 5: Look for capitalized word sequences
  const capsMatch = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/);
  if (capsMatch) {
    const name = cleanAndValidateName(capsMatch[1]);
    if (name) return name;
  }
  
  return null;
};

/**
 * Extract date of birth from text
 */
const extractDOB = (text) => {
  const dobPatterns = [
    /(?:DOB|D\.O\.B|Date of Birth|जन्म तिथि|Year of Birth)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
    /(?:DOB|D\.O\.B|Date of Birth)[:\s]*(\d{4})/i, // Year only
    /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/,
    /\b(\d{2}[\/\-]\d{2}[\/\-]\d{2})\b/
  ];
  
  for (const pattern of dobPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

/**
 * Extract gender from text
 */
const extractGender = (text) => {
  const upperText = text.toUpperCase();
  
  if (upperText.includes('MALE') || upperText.includes('पुरुष')) {
    if (upperText.includes('FEMALE') || upperText.includes('महिला')) {
      return 'Female';
    }
    return 'Male';
  }
  if (upperText.includes('FEMALE') || upperText.includes('महिला') || upperText.includes('स्त्री')) {
    return 'Female';
  }
  
  // Check for gender symbols or abbreviations
  if (/\bM\b/.test(upperText) && !/\bF\b/.test(upperText)) {
    return 'Male';
  }
  if (/\bF\b/.test(upperText)) {
    return 'Female';
  }
  
  return null;
};

/**
 * Extract address from text
 */
const extractAddress = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  // Look for address patterns
  const addressPatterns = [
    /(?:Address|पता)[:\s]*(.+?)(?=\d{6}|\bPIN\b|$)/is,
    /(?:S\/O|D\/O|W\/O|C\/O)[:\s]*(.+?)(?=\d{6}|\bPIN\b|$)/is
  ];
  
  for (const pattern of addressPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].replace(/\s+/g, ' ').trim();
    }
  }
  
  // Look for PIN code and extract address before it
  const pinMatch = text.match(/(.+?)(\d{6})/s);
  if (pinMatch) {
    const potentialAddress = pinMatch[1].slice(-200); // Last 200 chars before PIN
    if (potentialAddress.length > 20) {
      return potentialAddress.replace(/\s+/g, ' ').trim();
    }
  }
  
  return null;
};

/**
 * Main Aadhaar verification function
 */
const verifyAadhaar = async (filePath) => {
  const startTime = Date.now();
  const validationMessages = [];
  let confidenceScore = 0;
  
  const result = {
    success: false,
    extractedData: {
      aadhaarNumber: null,
      name: null,
      dateOfBirth: null,
      gender: null,
      address: null,
      qrCodeData: null,
      rawText: null
    },
    verificationDetails: {
      numberValid: false,
      formatValid: false,
      qrCodeFound: false,
      qrDataMatches: false,
      checksumValid: false,
      tamperingDetected: false,
      imageQuality: 'fair',
      validationMessages: []
    },
    confidenceScore: 0,
    status: 'pending',
    processingTime: 0
  };
  
  try {
    // Step 1: Extract text using OCR
    const ocrResult = await extractText(filePath);
    
    if (!ocrResult.success) {
      validationMessages.push('OCR extraction failed');
      result.status = 'rejected';
      result.verificationDetails.validationMessages = validationMessages;
      result.processingTime = Date.now() - startTime;
      return result;
    }
    
    result.extractedData.rawText = ocrResult.text;
    
    // Determine image quality from OCR confidence
    if (ocrResult.confidence >= 80) {
      result.verificationDetails.imageQuality = 'excellent';
      confidenceScore += 15;
    } else if (ocrResult.confidence >= 60) {
      result.verificationDetails.imageQuality = 'good';
      confidenceScore += 10;
    } else if (ocrResult.confidence >= 40) {
      result.verificationDetails.imageQuality = 'fair';
      confidenceScore += 5;
    } else {
      result.verificationDetails.imageQuality = 'poor';
      validationMessages.push('Poor image quality detected');
    }
    
    // Step 2: Extract Aadhaar number
    const aadhaarNumber = extractAadhaarNumber(ocrResult.text);
    
    if (aadhaarNumber) {
      result.extractedData.aadhaarNumber = aadhaarNumber;
      result.verificationDetails.formatValid = true;
      confidenceScore += 20;
      validationMessages.push('Aadhaar number format valid (12 digits)');
      
      // Validate using Verhoeff checksum
      if (validateAadhaarChecksum(aadhaarNumber)) {
        result.verificationDetails.checksumValid = true;
        result.verificationDetails.numberValid = true;
        confidenceScore += 25;
        validationMessages.push('Aadhaar checksum validation passed');
      } else {
        validationMessages.push('Aadhaar checksum validation failed');
      }
    } else {
      validationMessages.push('Could not extract valid Aadhaar number');
    }
    
    // Step 3: Extract other details
    result.extractedData.name = extractName(ocrResult.text);
    result.extractedData.dateOfBirth = extractDOB(ocrResult.text);
    result.extractedData.gender = extractGender(ocrResult.text);
    result.extractedData.address = extractAddress(ocrResult.text);
    
    if (result.extractedData.name) {
      confidenceScore += 10;
      validationMessages.push('Name extracted successfully');
    }
    if (result.extractedData.dateOfBirth) {
      confidenceScore += 10;
      validationMessages.push('Date of birth extracted');
    }
    if (result.extractedData.gender) {
      confidenceScore += 5;
      validationMessages.push('Gender extracted');
    }
    
    // Step 4: Scan QR code
    const qrResult = await scanQRCode(filePath);
    
    if (qrResult.success) {
      result.verificationDetails.qrCodeFound = true;
      confidenceScore += 15;
      validationMessages.push('QR code detected in document');
      
      // Parse QR data
      const qrParsed = parseAadhaarQRData(qrResult.data);
      result.extractedData.qrCodeData = qrParsed.data;
      
      // Compare QR data with OCR data
      if (qrParsed.success && qrParsed.data) {
        const qrAadhaar = qrParsed.data.aadhaarNumber || qrParsed.data.uid;
        
        if (qrAadhaar && result.extractedData.aadhaarNumber) {
          const qrClean = qrAadhaar.replace(/\D/g, '');
          const ocrClean = result.extractedData.aadhaarNumber.replace(/\D/g, '');
          
          if (qrClean === ocrClean) {
            result.verificationDetails.qrDataMatches = true;
            confidenceScore += 20;
            validationMessages.push('QR code data matches OCR data');
          } else {
            validationMessages.push('QR code data does not match OCR - possible tampering');
            result.verificationDetails.tamperingDetected = true;
            confidenceScore -= 20;
          }
        }
        
        // Use QR data to fill missing fields
        if (!result.extractedData.name && qrParsed.data.name) {
          result.extractedData.name = qrParsed.data.name;
        }
        if (!result.extractedData.dateOfBirth && qrParsed.data.dateOfBirth) {
          result.extractedData.dateOfBirth = qrParsed.data.dateOfBirth;
        }
        if (!result.extractedData.gender && qrParsed.data.gender) {
          result.extractedData.gender = qrParsed.data.gender;
        }
      }
    } else {
      validationMessages.push('No QR code found or QR code unreadable');
    }
    
    // Step 5: Determine final status
    result.confidenceScore = Math.min(100, Math.max(0, confidenceScore));
    
    if (result.confidenceScore >= 70 && result.verificationDetails.numberValid) {
      result.status = 'verified';
      result.success = true;
    } else if (result.confidenceScore >= 40 || result.verificationDetails.formatValid) {
      result.status = 'suspicious';
    } else {
      result.status = 'rejected';
    }
    
    // Check for tampering indicators
    if (result.verificationDetails.tamperingDetected) {
      result.status = 'suspicious';
      if (result.confidenceScore > 50) {
        result.confidenceScore -= 20;
      }
    }
    
    result.verificationDetails.validationMessages = validationMessages;
    result.processingTime = Date.now() - startTime;
    
    return result;
    
  } catch (error) {
    console.error('Aadhaar Verification Error:', error);
    result.status = 'rejected';
    result.verificationDetails.validationMessages = [
      'Verification process failed',
      error.message
    ];
    result.processingTime = Date.now() - startTime;
    return result;
  }
};

module.exports = {
  verifyAadhaar,
  validateAadhaarChecksum,
  extractAadhaarNumber,
  extractName,
  extractDOB,
  extractGender,
  extractAddress
};
