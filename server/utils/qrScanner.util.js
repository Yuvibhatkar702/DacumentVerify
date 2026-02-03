/**
 * QR Code Scanner Utility
 * Decodes QR codes from images for Aadhaar verification
 */

const Jimp = require('jimp');
const jsQR = require('jsqr');
const fs = require('fs');

/**
 * Scan QR code from image file
 */
const scanQRCode = async (imagePath) => {
  try {
    // Read image using Jimp
    const image = await Jimp.read(imagePath);
    
    // Get image data
    const width = image.getWidth();
    const height = image.getHeight();
    
    // Convert to raw RGBA data
    const imageData = new Uint8ClampedArray(width * height * 4);
    let idx = 0;
    
    image.scan(0, 0, width, height, function(x, y, index) {
      imageData[idx++] = this.bitmap.data[index + 0]; // R
      imageData[idx++] = this.bitmap.data[index + 1]; // G
      imageData[idx++] = this.bitmap.data[index + 2]; // B
      imageData[idx++] = this.bitmap.data[index + 3]; // A
    });
    
    // Decode QR code
    const code = jsQR(imageData, width, height);
    
    if (code) {
      return {
        success: true,
        data: code.data,
        location: code.location
      };
    }
    
    // If not found, try with different image processing
    // Try grayscale version
    const grayImage = image.clone().grayscale();
    const grayData = new Uint8ClampedArray(width * height * 4);
    idx = 0;
    
    grayImage.scan(0, 0, width, height, function(x, y, index) {
      grayData[idx++] = this.bitmap.data[index + 0];
      grayData[idx++] = this.bitmap.data[index + 1];
      grayData[idx++] = this.bitmap.data[index + 2];
      grayData[idx++] = this.bitmap.data[index + 3];
    });
    
    const grayCode = jsQR(grayData, width, height);
    
    if (grayCode) {
      return {
        success: true,
        data: grayCode.data,
        location: grayCode.location
      };
    }
    
    // Try with contrast enhancement
    const contrastImage = image.clone().contrast(0.5);
    const contrastData = new Uint8ClampedArray(width * height * 4);
    idx = 0;
    
    contrastImage.scan(0, 0, width, height, function(x, y, index) {
      contrastData[idx++] = this.bitmap.data[index + 0];
      contrastData[idx++] = this.bitmap.data[index + 1];
      contrastData[idx++] = this.bitmap.data[index + 2];
      contrastData[idx++] = this.bitmap.data[index + 3];
    });
    
    const contrastCode = jsQR(contrastData, width, height);
    
    if (contrastCode) {
      return {
        success: true,
        data: contrastCode.data,
        location: contrastCode.location
      };
    }
    
    return {
      success: false,
      data: null,
      error: 'No QR code found in image'
    };
    
  } catch (error) {
    console.error('QR Scan Error:', error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

/**
 * Parse Aadhaar QR code data
 * Aadhaar QR codes contain XML or JSON data with user information
 */
const parseAadhaarQRData = (qrData) => {
  try {
    // Try parsing as XML (older format)
    if (qrData.includes('<?xml') || qrData.includes('<PrintLetterBarcodeData')) {
      return parseAadhaarXML(qrData);
    }
    
    // Try parsing as JSON (newer format)
    try {
      const jsonData = JSON.parse(qrData);
      return {
        success: true,
        format: 'json',
        data: {
          name: jsonData.name || jsonData.n,
          dateOfBirth: jsonData.dob || jsonData.d,
          gender: jsonData.gender || jsonData.g,
          aadhaarNumber: jsonData.uid || jsonData.u,
          address: jsonData.address || jsonData.a,
          pincode: jsonData.pincode || jsonData.pc
        }
      };
    } catch (e) {
      // Not JSON
    }
    
    // Try parsing as digit sequence (secure QR)
    if (/^\d+$/.test(qrData.replace(/\s/g, ''))) {
      return {
        success: true,
        format: 'secure',
        data: {
          raw: qrData,
          note: 'Secure QR code - contains encrypted data'
        }
      };
    }
    
    // Unknown format but has data
    return {
      success: true,
      format: 'unknown',
      data: { raw: qrData }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Parse Aadhaar XML format
 */
const parseAadhaarXML = (xmlData) => {
  try {
    // Extract attributes using regex (simple parsing)
    const getAttribute = (attr) => {
      const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
      const match = xmlData.match(regex);
      return match ? match[1] : null;
    };
    
    return {
      success: true,
      format: 'xml',
      data: {
        name: getAttribute('name'),
        dateOfBirth: getAttribute('dob'),
        gender: getAttribute('gender'),
        aadhaarNumber: getAttribute('uid'),
        address: [
          getAttribute('house'),
          getAttribute('street'),
          getAttribute('lm'),
          getAttribute('loc'),
          getAttribute('vtc'),
          getAttribute('dist'),
          getAttribute('state')
        ].filter(Boolean).join(', '),
        pincode: getAttribute('pc'),
        careOf: getAttribute('co')
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  scanQRCode,
  parseAadhaarQRData,
  parseAadhaarXML
};
