/**
 * QR scanner service delegates to shared utility.
 */

const { scanAadhaarQRCode, parseAadhaarQR } = require('../utils/qrScanner');

module.exports = {
  scanAadhaarQRCode,
  parseAadhaarQR
};
