/**
 * OCR Utility - Text Extraction using Tesseract.js
 */

const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const pdfParse = require('pdf-parse');

const tessdataDir = path.join(__dirname, '..');
const tesseractCacheDir = path.join(__dirname, '..', 'tesseract-cache');

if (!fs.existsSync(tesseractCacheDir)) {
  fs.mkdirSync(tesseractCacheDir, { recursive: true });
}

/**
 * Preprocess image for better OCR accuracy
 */
const preprocessImage = async (imagePath) => {
  const outputPath = imagePath.replace(/\.[^/.]+$/, '_processed.png');
  
  try {
    await sharp(imagePath)
      .resize({ width: 1500, withoutEnlargement: false })
      .grayscale() // Convert to grayscale
      .normalize() // Normalize contrast
      .linear(1.4, -30) // Increase contrast for printed text
      .sharpen() // Sharpen the image
      .png()
      .toFile(outputPath);
    
    return outputPath;
  } catch (error) {
    console.log('Image preprocessing failed, using original:', error.message);
    return imagePath;
  }
};

/**
 * Extract text from image using Tesseract OCR
 */
const extractTextFromImage = async (imagePath, options = {}) => {
  const {
    preprocess = true,
    lang = 'eng+hin' // English and Hindi for Indian documents
  } = options;
  
  let processedPath = imagePath;
  
  try {
    // Preprocess image if enabled
    if (preprocess) {
      processedPath = await preprocessImage(imagePath);
    }
    
    // Perform OCR
    const recognizeOptions = {
      langPath: tessdataDir,
      cachePath: tesseractCacheDir,
      gzip: false,
      logger: m => {
        if (m.status === 'recognizing text') {
          // Progress logging (optional)
        }
      }
    };

    let result = await Tesseract.recognize(processedPath, lang, {
      ...recognizeOptions,
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      preserve_interword_spaces: '1'
    });

    // If preprocessing hurt OCR (low confidence or empty text), retry on original
    if ((result.data.confidence || 0) < 40 || !result.data.text?.trim()) {
      result = await Tesseract.recognize(imagePath, lang, {
        ...recognizeOptions,
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        preserve_interword_spaces: '1'
      });
    }
    
    // Cleanup processed image if different from original
    if (processedPath !== imagePath && fs.existsSync(processedPath)) {
      fs.unlinkSync(processedPath);
    }
    
    return {
      success: true,
      text: result.data.text,
      confidence: result.data.confidence,
      words: result.data.words || [],
      lines: result.data.lines || []
    };
    
  } catch (error) {
    console.error('OCR Error:', error);
    
    // Cleanup on error
    if (processedPath !== imagePath && fs.existsSync(processedPath)) {
      fs.unlinkSync(processedPath);
    }
    
    return {
      success: false,
      text: '',
      confidence: 0,
      error: error.message
    };
  }
};

/**
 * Extract text from PDF
 */
const extractTextFromPDF = async (pdfPath) => {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);
    
    return {
      success: true,
      text: data.text,
      confidence: 85, // PDF text extraction is generally reliable
      pages: data.numpages
    };
  } catch (error) {
    console.error('PDF Extraction Error:', error);
    return {
      success: false,
      text: '',
      confidence: 0,
      error: error.message
    };
  }
};

/**
 * Main function to extract text from document
 */
const extractText = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.pdf') {
    return await extractTextFromPDF(filePath);
  } else {
    return await extractTextFromImage(filePath);
  }
};

/**
 * Clean and normalize extracted text
 */
const cleanText = (text) => {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s@.,/-]/g, '') // Remove special characters except common ones
    .trim();
};

module.exports = {
  extractTextFromImage,
  extractTextFromPDF,
  extractText,
  preprocessImage,
  cleanText
};
