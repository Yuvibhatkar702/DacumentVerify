const { scanAadhaarQRCode } = require('./services/qr-scanner.service');
const { runAadhaarOCR } = require('./services/ocr.service');
const path = require('path');

async function test() {
    const filePath = 'D:\\DacumentVerify\\server\\uploads\\documents\\699de77e6236491b8ae2681f_aadhaar_1777063914632.jpeg';
    console.log('Selected File:', path.basename(filePath));

    try {
        const qrResult = await scanAadhaarQRCode(filePath);
        console.log('scanAadhaarQRCode:', {
            qrDetected: qrResult.qrDetected,
            message: qrResult.message,
            extractedData: qrResult.extractedData
        });

        const ocrResult = await runAadhaarOCR(filePath);
        console.log('runAadhaarOCR:', {
            confidenceScore: ocrResult.confidenceScore,
            extractedData: ocrResult.extractedData
        });

        const merged = {
            aadhaarNumber: qrResult.extractedData?.aadhaarNumber || ocrResult.extractedData?.aadhaarNumber || 'N/A',
            dob: qrResult.extractedData?.dob || ocrResult.extractedData?.dob || 'N/A',
            gender: qrResult.extractedData?.gender || ocrResult.extractedData?.gender || 'N/A'
        };
        console.log('Merged Sanity:', merged);
    } catch (err) {
        console.error('Error during test:', err);
    }
}

test();
