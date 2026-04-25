const { scanAadhaarQRCode } = require('./services/qr-scanner.service');
const { runAadhaarOCR } = require('./services/ocr.service');
const path = require('path');

async function test() {
  const imagePath = path.resolve('uploads/documents/69ebc5e3351fa42667f3c92e_aadhaar_1777065482840.jpeg');
  
  const qrResult = await scanAadhaarQRCode(imagePath);
  const ocrResult = await runAadhaarOCR(imagePath);
  
  const output = {
    qr: {
      qrDetected: qrResult.qrDetected,
      message: qrResult.message,
      extractedData: qrResult.extractedData
    },
    ocr: {
      confidenceScore: ocrResult.confidenceScore,
      extractedData: ocrResult.extractedData
    }
  };
  
  console.log(JSON.stringify(output));
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
