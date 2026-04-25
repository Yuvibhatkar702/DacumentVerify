/**
 * QR Code Scanner Utility
 * Decodes QR codes from images for Aadhaar verification
 */

const sharp = require('sharp');
const jsQR = require('jsqr');
const fs = require('fs');
const path = require('path');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tif', '.tiff']);

const isImageFile = (filePath) => IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());

const toRawRGBA = async (pipeline) => {
  const { data, info } = await pipeline
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    imageData: new Uint8ClampedArray(data),
    width: info.width,
    height: info.height
  };
};

const decodeFromRaw = ({ imageData, width, height }) => {
  return jsQR(imageData, width, height, {
    inversionAttempts: 'attemptBoth'
  });
};

const buildImageVariants = async (imagePath) => {
  const base = sharp(imagePath, { failOn: 'none' });
  const metadata = await base.metadata();
  const width = metadata.width || 1000;
  const height = metadata.height || 700;

  const variants = [];

  // Full image variants
  variants.push(await toRawRGBA(base.clone().png()));
  variants.push(await toRawRGBA(base.clone().grayscale().normalize().png()));
  variants.push(await toRawRGBA(base.clone().grayscale().normalize().linear(1.3, -25).png()));
  variants.push(await toRawRGBA(base.clone().grayscale().normalize().threshold(145).png()));
  variants.push(await toRawRGBA(base.clone().resize({ width: Math.max(1500, width * 2), withoutEnlargement: false }).grayscale().normalize().png()));

  // Rotations
  for (const angle of [90, 180, 270]) {
    variants.push(await toRawRGBA(base.clone().rotate(angle).grayscale().normalize().png()));
  }

  // Bottom area crop (many Aadhaar cards have QR near lower region)
  const cropY = Math.floor(height * 0.45);
  const cropH = Math.max(100, height - cropY);
  variants.push(await toRawRGBA(
    base
      .clone()
      .extract({ left: 0, top: cropY, width, height: cropH })
      .resize({ width: Math.max(1200, width * 2), withoutEnlargement: false })
      .grayscale()
      .normalize()
      .png()
  ));

  return variants;
};

/**
 * Scan QR code from image file
 */
const scanQRCode = async (imagePath) => {
  try {
    if (!fs.existsSync(imagePath)) {
      return {
        success: false,
        data: null,
        error: 'File not found'
      };
    }

    if (!isImageFile(imagePath)) {
      return {
        success: false,
        data: null,
        error: 'QR scanning supports image files only'
      };
    }

    const variants = await buildImageVariants(imagePath);

    for (const variant of variants) {
      const code = decodeFromRaw(variant);
      if (code && code.data) {
        return {
          success: true,
          data: code.data,
          location: code.location
        };
      }
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
    const getAttribute = (attr) => {
      const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
      const match = xmlData.match(regex);
      return match ? match[1] : null;
    };

    const getTagValue = (tag) => {
      const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, 'i');
      const match = xmlData.match(regex);
      return match ? match[1] : null;
    };

    const getValue = (primary, secondary) => {
      return getTagValue(primary) || getTagValue(secondary) || getAttribute(primary) || getAttribute(secondary);
    };

    const addressTag = getTagValue('Address') || getTagValue('address');
    const assembledAddress = [
      getValue('house', 'House'),
      getValue('street', 'Street'),
      getValue('lm', 'Lm'),
      getValue('loc', 'Loc'),
      getValue('vtc', 'Vtc'),
      getValue('dist', 'Dist'),
      getValue('state', 'State'),
      getValue('pc', 'Pc')
    ].filter(Boolean).join(', ');
    
    return {
      success: true,
      format: 'xml',
      data: {
        name: getValue('Name', 'name'),
        dateOfBirth: getValue('Dob', 'dob') || getValue('Yob', 'yob'),
        gender: getValue('Gender', 'gender'),
        aadhaarNumber: getValue('Uid', 'uid'),
        address: addressTag || assembledAddress || null,
        pincode: getValue('Pc', 'pc'),
        careOf: getValue('Co', 'co')
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
