const { scanAadhaarQRCode } = require('./services/qr-scanner.service');
const { runAadhaarOCR } = require('./services/ocr.service');
const path = require('path');

const imagePath = path.resolve('uploads/documents/69ebc5e3351fa42667f3c92e_aadhaar_1777065482840.jpeg');

async function run() {
  try {
    const qrResult = await scanAadhaarQRCode(imagePath);
    const ocrResult = await runAadhaarOCR(imagePath);

    const output = {
      qrDetected: qrResult.qrDetected,
      message: qrResult.message,
      ocr: {
        confidence: ocrResult.confidenceScore,
        extractedData: ocrResult.extractedData
      }
    };

    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }, null, 2));
  }
}

run();
