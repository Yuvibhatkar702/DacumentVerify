/**
 * PAN Card Verification Utility
 * Validates PAN card using OCR and regex patterns
 */

const { extractText, cleanText } = require('./ocr.util');

/**
 * PAN card regex pattern
 * Format: AAAAA9999A
 * - First 3 characters: Alphabetic series (AAA to ZZZ)
 * - 4th character: Status of PAN holder (P=Individual, C=Company, etc.)
 * - 5th character: First character of last name/first name
 * - 6th-9th characters: Sequential numbers (0001 to 9999)
 * - 10th character: Alphabetic check digit
 */
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

/**
 * 4th character meanings in PAN
 */
const PAN_HOLDER_TYPES = {
  'A': 'Association of Persons (AOP)',
  'B': 'Body of Individuals (BOI)',
  'C': 'Company',
  'F': 'Firm',
  'G': 'Government',
  'H': 'HUF (Hindu Undivided Family)',
  'L': 'Local Authority',
  'J': 'Artificial Juridical Person',
  'P': 'Individual/Person',
  'T': 'Trust (AOP)',
  'K': 'Krishi (Agricultural Income)'
};

/**
 * Validate PAN format
 */
const validatePANFormat = (pan) => {
  if (!pan || typeof pan !== 'string') {
    return { valid: false, reason: 'PAN is empty or invalid' };
  }
  
  const cleanPAN = pan.toUpperCase().replace(/\s/g, '');
  
  if (cleanPAN.length !== 10) {
    return { valid: false, reason: 'PAN must be exactly 10 characters' };
  }
  
  if (!PAN_REGEX.test(cleanPAN)) {
    return { valid: false, reason: 'PAN format is invalid' };
  }
  
  // Check 4th character (holder type)
  const holderType = cleanPAN[3];
  if (!PAN_HOLDER_TYPES[holderType]) {
    return { valid: false, reason: 'Invalid PAN holder type code' };
  }
  
  return {
    valid: true,
    pan: cleanPAN,
    holderType: PAN_HOLDER_TYPES[holderType],
    holderTypeCode: holderType
  };
};

/**
 * Extract PAN number from text
 */
const extractPANNumber = (text) => {
  // Clean and uppercase the text
  const cleanedText = text.toUpperCase();
  
  // Multiple patterns to catch PAN numbers
  const patterns = [
    /\b([A-Z]{5}[0-9]{4}[A-Z])\b/g,
    /(?:PAN|Permanent Account Number)[:\s]*([A-Z]{5}[0-9]{4}[A-Z])/gi,
    /(?:Account Number)[:\s]*([A-Z]{5}[0-9]{4}[A-Z])/gi
  ];
  
  for (const pattern of patterns) {
    const matches = cleanedText.match(pattern);
    if (matches) {
      for (const match of matches) {
        // Extract just the PAN part
        const panMatch = match.match(/[A-Z]{5}[0-9]{4}[A-Z]/);
        if (panMatch) {
          const validation = validatePANFormat(panMatch[0]);
          if (validation.valid) {
            return panMatch[0];
          }
        }
      }
    }
  }
  
  return null;
};

/**
 * Extract name from PAN card text
 */
const extractPANName = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  // Name patterns for PAN card
  const namePatterns = [
    /(?:Name|नाम)\s*[:\-]?\s*([A-Za-z\s]+)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})$/m
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      // Filter out common PAN card text that's not a name
      if (name.length > 3 && name.length < 50 && 
          !name.includes('INCOME TAX') && 
          !name.includes('DEPARTMENT') &&
          !name.includes('GOVT')) {
        return name;
      }
    }
  }
  
  // Try to find name by looking for lines with only letters
  for (const line of lines) {
    const cleanLine = line.replace(/[^A-Za-z\s]/g, '').trim();
    if (cleanLine.length > 5 && cleanLine.length < 50) {
      const words = cleanLine.split(/\s+/);
      if (words.length >= 2 && words.length <= 5) {
        // Check if looks like a name (proper capitalization)
        const looksLikeName = words.every(w => /^[A-Z][a-z]*$/.test(w) || /^[A-Z]+$/.test(w));
        if (looksLikeName && 
            !cleanLine.includes('INCOME') && 
            !cleanLine.includes('DEPARTMENT') &&
            !cleanLine.includes('PERMANENT')) {
          return cleanLine;
        }
      }
    }
  }
  
  return null;
};

/**
 * Extract father's name from PAN card
 */
const extractFatherName = (text) => {
  const patterns = [
    /(?:Father'?s?\s*Name|पिता का नाम)[:\s]*([A-Za-z\s]+)/i,
    /(?:S\/O|D\/O|C\/O)[:\s]*([A-Za-z\s]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      if (name.length > 3 && name.length < 50) {
        return name;
      }
    }
  }
  
  return null;
};

/**
 * Extract date of birth from PAN card
 */
const extractPANDOB = (text) => {
  const dobPatterns = [
    /(?:DOB|D\.O\.B|Date of Birth|जन्म तिथि)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
    /(?:Date of Birth)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
    /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/
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
 * Main PAN verification function
 */
const verifyPAN = async (filePath) => {
  const startTime = Date.now();
  const validationMessages = [];
  let confidenceScore = 0;
  
  const result = {
    success: false,
    extractedData: {
      panNumber: null,
      name: null,
      fatherName: null,
      dateOfBirth: null,
      holderType: null,
      rawText: null
    },
    verificationDetails: {
      numberValid: false,
      formatValid: false,
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
    
    // Step 2: Extract PAN number
    const panNumber = extractPANNumber(ocrResult.text);
    
    if (panNumber) {
      result.extractedData.panNumber = panNumber;
      
      // Validate PAN format
      const panValidation = validatePANFormat(panNumber);
      
      if (panValidation.valid) {
        result.verificationDetails.formatValid = true;
        result.verificationDetails.numberValid = true;
        result.extractedData.holderType = panValidation.holderType;
        confidenceScore += 35;
        validationMessages.push('PAN format is valid (matches ^[A-Z]{5}[0-9]{4}[A-Z]$)');
        validationMessages.push(`PAN holder type: ${panValidation.holderType}`);
      } else {
        validationMessages.push(`PAN validation failed: ${panValidation.reason}`);
      }
    } else {
      validationMessages.push('Could not extract valid PAN number');
    }
    
    // Step 3: Extract other details
    result.extractedData.name = extractPANName(ocrResult.text);
    result.extractedData.fatherName = extractFatherName(ocrResult.text);
    result.extractedData.dateOfBirth = extractPANDOB(ocrResult.text);
    
    if (result.extractedData.name) {
      confidenceScore += 15;
      validationMessages.push('Name extracted successfully');
      
      // Check if name matches 5th character of PAN
      if (result.extractedData.panNumber && result.extractedData.name) {
        const fifthChar = result.extractedData.panNumber[4];
        const nameFirst = result.extractedData.name.charAt(0).toUpperCase();
        
        // For individual PAN (4th char = 'P'), 5th char should match surname first letter
        // This is a soft check as it depends on surname vs first name
        if (fifthChar === nameFirst) {
          confidenceScore += 10;
          validationMessages.push('PAN 5th character matches name initial');
        }
      }
    }
    
    if (result.extractedData.fatherName) {
      confidenceScore += 10;
      validationMessages.push("Father's name extracted");
    }
    
    if (result.extractedData.dateOfBirth) {
      confidenceScore += 10;
      validationMessages.push('Date of birth extracted');
    }
    
    // Step 4: Check for PAN card keywords
    const upperText = ocrResult.text.toUpperCase();
    const panKeywords = [
      'INCOME TAX DEPARTMENT',
      'PERMANENT ACCOUNT NUMBER',
      'GOVT. OF INDIA',
      'GOVERNMENT OF INDIA'
    ];
    
    let keywordMatches = 0;
    for (const keyword of panKeywords) {
      if (upperText.includes(keyword)) {
        keywordMatches++;
      }
    }
    
    if (keywordMatches > 0) {
      confidenceScore += keywordMatches * 5;
      validationMessages.push(`Found ${keywordMatches} PAN card identifier(s)`);
    } else {
      validationMessages.push('No standard PAN card identifiers found');
      confidenceScore -= 10;
    }
    
    // Step 5: Determine final status
    result.confidenceScore = Math.min(100, Math.max(0, confidenceScore));
    
    if (result.confidenceScore >= 65 && result.verificationDetails.numberValid) {
      result.status = 'verified';
      result.success = true;
    } else if (result.confidenceScore >= 35 || result.verificationDetails.formatValid) {
      result.status = 'suspicious';
    } else {
      result.status = 'rejected';
    }
    
    result.verificationDetails.validationMessages = validationMessages;
    result.processingTime = Date.now() - startTime;
    
    return result;
    
  } catch (error) {
    console.error('PAN Verification Error:', error);
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
  verifyPAN,
  validatePANFormat,
  extractPANNumber,
  extractPANName,
  extractFatherName,
  extractPANDOB,
  PAN_REGEX,
  PAN_HOLDER_TYPES
};
