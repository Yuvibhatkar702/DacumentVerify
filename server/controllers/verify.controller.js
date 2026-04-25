/**
 * Verification Controller
 * Handles document verification for Aadhaar and PAN cards
 */

const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const Document = require('../models/Document.model');
const { verifyAadhaar } = require('../utils/aadhaarVerification.util');
const { verifyPAN } = require('../utils/panVerification.util');
const { validateAadhaarChecksum } = require('../utils/aadhaarVerification.util');
const { scanAadhaarQRCode } = require('../services/qr-scanner.service');
const { runAadhaarOCR } = require('../services/ocr.service');
const { verifyWithOcrFallback } = require('../utils/ocrFallback');
const { generateFileHash } = require('../utils/hash.util');
const { deleteFile } = require('../utils/cleanup');
const { documentsDir } = require('../middleware/upload.middleware');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
const PYTHON_SERVICE_TIMEOUT_MS = Number(process.env.PYTHON_SERVICE_TIMEOUT_MS || 12000);
const USE_PYTHON_SERVICE = process.env.USE_PYTHON_SERVICE !== 'false';

const sanitizeAadhaar = (value) => (value ? value.replace(/\D/g, '') : null);

const hasReadableQrData = (qrData) => {
  if (!qrData) return false;
  return Boolean(qrData.aadhaarNumber || qrData.name || qrData.dob || qrData.gender || qrData.address);
};

const mergeAadhaarData = (qrData, ocrData) => ({
  aadhaarNumber: qrData?.aadhaarNumber || ocrData?.aadhaarNumber || null,
  name: qrData?.name || ocrData?.name || null,
  dob: qrData?.dob || ocrData?.dob || null,
  gender: qrData?.gender || ocrData?.gender || null,
  address: qrData?.address || ocrData?.address || null
});

const compareAadhaarFields = (qrData, ocrData) => {
  const fields = ['aadhaarNumber', 'name', 'dob', 'gender', 'address'];
  let matched = 0;
  let comparable = 0;
  const mismatches = [];

  for (const field of fields) {
    const qrVal = qrData?.[field];
    const ocrVal = ocrData?.[field];

    if (!qrVal || !ocrVal) {
      continue;
    }

    comparable += 1;

    let isMatch = false;

    if (field === 'aadhaarNumber') {
      isMatch = sanitizeAadhaar(qrVal) === sanitizeAadhaar(ocrVal);
    } else if (field === 'address') {
      const q = String(qrVal).toLowerCase();
      const o = String(ocrVal).toLowerCase();
      isMatch = q.includes(o) || o.includes(q);
    } else {
      isMatch = String(qrVal).toLowerCase() === String(ocrVal).toLowerCase();
    }

    if (isMatch) {
      matched += 1;
    } else {
      mismatches.push(field);
    }
  }

  return {
    matched,
    comparable,
    mismatches,
    qrDataMatches: comparable > 0 && matched === comparable,
    matchPercent: Math.round((matched / fields.length) * 100)
  };
};

const calculateDocumentConfidence = ({ comparison, extractedData }) => {
  if (comparison.comparable > 0) {
    return comparison.matchPercent;
  }

  const fields = ['aadhaarNumber', 'name', 'dob', 'gender', 'address'];
  const present = fields.filter((field) => Boolean(extractedData?.[field])).length;
  return Math.round((present / fields.length) * 100);
};

const callPythonService = async (endpoint, filePath) => {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath), path.basename(filePath));

  const response = await axios.post(`${PYTHON_SERVICE_URL}${endpoint}`, formData, {
    headers: formData.getHeaders(),
    timeout: PYTHON_SERVICE_TIMEOUT_MS,
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });

  if (!response?.data?.success) {
    throw new Error(response?.data?.message || `Python service returned an invalid response for ${endpoint}`);
  }

  return response.data.data || {};
};

const runAadhaarQrViaPython = async (filePath) => {
  const data = await callPythonService('/process-qr', filePath);

  return {
    success: Boolean(data.qrFound),
    qrFound: Boolean(data.qrFound),
    qrDetected: Boolean(data.qrFound),
    extractedData: data.extractedData || null,
    confidenceScore: data.confidenceScore || 0,
    rawPayload: data.rawPayload || null,
    message: data.message || (data.qrFound ? 'Python QR extraction completed' : 'No readable Aadhaar QR data found')
  };
};

const runAadhaarOcrViaPython = async (filePath) => {
  const data = await callPythonService('/process-ocr', filePath);

  return {
    success: true,
    extractedData: data.extractedData || null,
    rawText: data.text || '',
    confidenceScore: data.confidenceScore || 0,
    message: data.message || 'Python OCR extraction completed'
  };
};

const runWithFallback = async (label, pythonRunner, fallbackRunner) => {
  if (!USE_PYTHON_SERVICE) {
    return fallbackRunner();
  }

  try {
    return await pythonRunner();
  } catch (error) {
    console.warn(`Python ${label} failed, falling back to Node ${label}:`, error.message);
    return fallbackRunner();
  }
};

const runAadhaarPipelines = async (filePath) => {
  const [qrResult, ocrResult] = await Promise.all([
    runWithFallback('QR', () => runAadhaarQrViaPython(filePath), () => scanAadhaarQRCode(filePath)),
    runWithFallback('OCR', () => runAadhaarOcrViaPython(filePath), () => runAadhaarOCR(filePath))
  ]);

  return { qrResult, ocrResult };
};

/**
 * @desc    Verify Aadhaar card
 * @route   POST /api/verify/aadhaar
 * @access  Private
 */
const verifyAadhaarCard = async (req, res) => {
  let tempFilePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an Aadhaar card image or PDF'
      });
    }
    
    tempFilePath = req.file.path;
    
    // Generate file hash for duplicate detection
    const fileHash = await generateFileHash(tempFilePath);
    
    // Check for duplicate submission
    const existingDoc = await Document.findOne({
      userId: req.user.id,
      documentType: 'aadhaar',
      fileHash: fileHash
    });
    
    if (existingDoc) {
      deleteFile(tempFilePath);
      return res.status(400).json({
        success: false,
        message: 'This document has already been verified',
        data: {
          existingVerification: existingDoc.getSummary()
        }
      });
    }
    
    // Move file to documents directory
    const newFileName = `${req.user.id}_aadhaar_${Date.now()}${path.extname(req.file.originalname)}`;
    const permanentPath = path.join(documentsDir, newFileName);
    fs.renameSync(tempFilePath, permanentPath);
    tempFilePath = permanentPath;
    
    // Perform verification
    const verificationResult = await verifyAadhaar(permanentPath);
    
    // Create document record
    const document = await Document.create({
      userId: req.user.id,
      documentType: 'aadhaar',
      originalFileName: req.file.originalname,
      filePath: permanentPath,
      fileHash: fileHash,
      extractedData: verificationResult.extractedData,
      verificationDetails: verificationResult.verificationDetails,
      confidenceScore: verificationResult.confidenceScore,
      status: verificationResult.status,
      processingTime: verificationResult.processingTime,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Mask Aadhaar number in response (show only last 4 digits)
    const maskedAadhaar = verificationResult.extractedData.aadhaarNumber
      ? 'XXXX XXXX ' + verificationResult.extractedData.aadhaarNumber.slice(-4)
      : null;
    
    res.status(200).json({
      success: true,
      message: `Aadhaar verification ${verificationResult.status}`,
      data: {
        documentId: document._id,
        documentType: 'aadhaar',
        status: verificationResult.status,
        confidenceScore: verificationResult.confidenceScore,
        extractedData: {
          aadhaarNumber: maskedAadhaar,
          name: verificationResult.extractedData.name,
          dateOfBirth: verificationResult.extractedData.dateOfBirth,
          gender: verificationResult.extractedData.gender,
          address: verificationResult.extractedData.address,
          qrCodeDetected: verificationResult.verificationDetails.qrCodeFound
        },
        verificationDetails: {
          numberValid: verificationResult.verificationDetails.numberValid,
          formatValid: verificationResult.verificationDetails.formatValid,
          qrCodeFound: verificationResult.verificationDetails.qrCodeFound,
          qrDataMatches: verificationResult.verificationDetails.qrDataMatches,
          checksumValid: verificationResult.verificationDetails.checksumValid,
          imageQuality: verificationResult.verificationDetails.imageQuality,
          validationMessages: verificationResult.verificationDetails.validationMessages
        },
        processingTime: verificationResult.processingTime
      }
    });
    
  } catch (error) {
    console.error('Aadhaar Verification Error:', error);
    
    // Clean up temp file on error
    if (tempFilePath) {
      deleteFile(tempFilePath);
    }
    
    res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Verify PAN card
 * @route   POST /api/verify/pan
 * @access  Private
 */
const verifyPANCard = async (req, res) => {
  let tempFilePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a PAN card image or PDF'
      });
    }
    
    tempFilePath = req.file.path;
    
    // Generate file hash for duplicate detection
    const fileHash = await generateFileHash(tempFilePath);
    
    // Check for duplicate submission
    const existingDoc = await Document.findOne({
      userId: req.user.id,
      documentType: 'pan',
      fileHash: fileHash
    });
    
    if (existingDoc) {
      deleteFile(tempFilePath);
      return res.status(400).json({
        success: false,
        message: 'This document has already been verified',
        data: {
          existingVerification: existingDoc.getSummary()
        }
      });
    }
    
    // Move file to documents directory
    const newFileName = `${req.user.id}_pan_${Date.now()}${path.extname(req.file.originalname)}`;
    const permanentPath = path.join(documentsDir, newFileName);
    fs.renameSync(tempFilePath, permanentPath);
    tempFilePath = permanentPath;
    
    // Perform verification
    const verificationResult = await verifyPAN(permanentPath);
    
    // Create document record
    const document = await Document.create({
      userId: req.user.id,
      documentType: 'pan',
      originalFileName: req.file.originalname,
      filePath: permanentPath,
      fileHash: fileHash,
      extractedData: {
        panNumber: verificationResult.extractedData.panNumber,
        name: verificationResult.extractedData.name,
        fatherName: verificationResult.extractedData.fatherName,
        dateOfBirth: verificationResult.extractedData.dateOfBirth,
        rawText: verificationResult.extractedData.rawText
      },
      verificationDetails: verificationResult.verificationDetails,
      confidenceScore: verificationResult.confidenceScore,
      status: verificationResult.status,
      processingTime: verificationResult.processingTime,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(200).json({
      success: true,
      message: `PAN verification ${verificationResult.status}`,
      data: {
        documentId: document._id,
        documentType: 'pan',
        status: verificationResult.status,
        confidenceScore: verificationResult.confidenceScore,
        extractedData: {
          panNumber: verificationResult.extractedData.panNumber,
          name: verificationResult.extractedData.name,
          fatherName: verificationResult.extractedData.fatherName,
          dateOfBirth: verificationResult.extractedData.dateOfBirth,
          holderType: verificationResult.extractedData.holderType
        },
        verificationDetails: {
          numberValid: verificationResult.verificationDetails.numberValid,
          formatValid: verificationResult.verificationDetails.formatValid,
          imageQuality: verificationResult.verificationDetails.imageQuality,
          validationMessages: verificationResult.verificationDetails.validationMessages
        },
        processingTime: verificationResult.processingTime
      }
    });
    
  } catch (error) {
    console.error('PAN Verification Error:', error);
    
    // Clean up temp file on error
    if (tempFilePath) {
      deleteFile(tempFilePath);
    }
    
    res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get verification details by ID
 * @route   GET /api/verify/:id
 * @access  Private
 */
const getVerificationById = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Verification record not found'
      });
    }
    
    // Mask sensitive data
    let maskedData = { ...document.extractedData };
    if (document.documentType === 'aadhaar' && maskedData.aadhaarNumber) {
      maskedData.aadhaarNumber = 'XXXX XXXX ' + maskedData.aadhaarNumber.slice(-4);
    }
    
    res.status(200).json({
      success: true,
      data: {
        id: document._id,
        documentType: document.documentType,
        originalFileName: document.originalFileName,
        status: document.status,
        confidenceScore: document.confidenceScore,
        extractedData: maskedData,
        verificationDetails: document.verificationDetails,
        processingTime: document.processingTime,
        createdAt: document.createdAt
      }
    });
    
  } catch (error) {
    console.error('Get Verification Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve verification details'
    });
  }
};

/**
 * @desc    Delete verification record
 * @route   DELETE /api/verify/:id
 * @access  Private
 */
const deleteVerification = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Verification record not found'
      });
    }
    
    // Delete file from filesystem
    if (document.filePath) {
      deleteFile(document.filePath);
    }
    
    // Delete database record
    await Document.findByIdAndDelete(document._id);
    
    res.status(200).json({
      success: true,
      message: 'Verification record deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete Verification Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete verification record'
    });
  }
};

/**
 * @desc    Unified document verification endpoint
 * @route   POST /api/verify/document
 * @access  Private
 */
const verifyDocument = async (req, res) => {
  let tempFilePath = null;

  try {
    const uploadedFile = req.file || (req.files && req.files[0]);
    const documentType = (req.body.documentType || 'aadhaar').toLowerCase();

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a document file'
      });
    }

    if (documentType !== 'aadhaar') {
      return res.status(400).json({
        success: false,
        message: 'This endpoint currently supports aadhaar only'
      });
    }

    tempFilePath = uploadedFile.path;

    const fileHash = await generateFileHash(tempFilePath);
    const newFileName = `${req.user.id}_${documentType}_${Date.now()}${path.extname(uploadedFile.originalname)}`;
    const permanentPath = path.join(documentsDir, newFileName);

    fs.renameSync(tempFilePath, permanentPath);
    tempFilePath = permanentPath;

    const { qrResult, ocrResult } = await runAadhaarPipelines(permanentPath);

    const extractedData = mergeAadhaarData(qrResult.extractedData, ocrResult.extractedData);

    const mergedAadhaar = sanitizeAadhaar(extractedData.aadhaarNumber);

    const formatValid = Boolean(mergedAadhaar && /^\d{12}$/.test(mergedAadhaar) && !mergedAadhaar.startsWith('0') && !mergedAadhaar.startsWith('1'));
    const numberValid = formatValid && validateAadhaarChecksum(mergedAadhaar);
    const qrFound = Boolean(qrResult.qrFound || qrResult.qrDetected);
    const comparison = compareAadhaarFields(qrResult.extractedData, ocrResult.extractedData);
    const qrDataMatches = comparison.qrDataMatches;

    const qrReadable = hasReadableQrData(qrResult.extractedData);
    const shouldUseFallback = !qrFound || !qrReadable;
    const fallback = shouldUseFallback
      ? verifyWithOcrFallback(ocrResult.extractedData || extractedData, ocrResult.rawText || '')
      : null;

    const verificationChecks = fallback
      ? {
          numberValid: fallback.checks.numberValid,
          formatValid: fallback.checks.formatValid,
          qrFound: false,
          qrDataMatches: false,
          checksumValid: fallback.checks.checksumValid,
          blacklisted: fallback.checks.blacklisted,
          nameMismatch: fallback.checks.nameMismatch,
          ocrFallbackUsed: fallback.checks.ocrFallbackUsed,
          mismatchedFields: comparison.mismatches
        }
      : {
          numberValid,
          formatValid,
          qrFound,
          qrDataMatches,
          checksumValid: numberValid,
          blacklisted: false,
          nameMismatch: !extractedData?.name,
          ocrFallbackUsed: false,
          mismatchedFields: comparison.mismatches
        };

    const confidenceScore = fallback
      ? fallback.confidenceScore
      : calculateDocumentConfidence({
          comparison,
          extractedData
        });

    const status = fallback
      ? fallback.status
      : (numberValid && qrFound && qrDataMatches
        ? 'verified'
        : ((numberValid || formatValid) ? 'suspicious' : 'rejected'));

    const verificationMessage = fallback ? fallback.message : 'QR and OCR cross-validation completed';

    await Document.create({
      userId: req.user.id,
      documentType,
      originalFileName: uploadedFile.originalname,
      filePath: permanentPath,
      fileHash,
      extractedData: {
        aadhaarNumber: extractedData.aadhaarNumber,
        name: extractedData.name,
        dateOfBirth: extractedData.dob,
        gender: extractedData.gender,
        address: extractedData.address,
        rawText: ocrResult.rawText || null,
        qrRaw: qrResult.rawPayload || null
      },
      verificationDetails: {
        ...verificationChecks,
        qrMessage: qrResult.message,
        ocrMessage: ocrResult.message,
        validationMessages: [
          fallback ? verificationMessage : qrResult.message,
          ocrResult.message,
          ...(comparison.mismatches.length ? [`Mismatched fields: ${comparison.mismatches.join(', ')}`] : [])
        ].filter(Boolean)
      },
      confidenceScore,
      status,
      processingTime: 0,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.status(200).json({
      success: true,
      qrDetected: qrFound,
      qrFound,
      qrExtractedData: qrResult.extractedData || null,
      extractedData,
      confidenceScore,
      verificationChecks,
      verificationMessage,
      status
    });
  } catch (error) {
    console.error('Unified Verification Error:', error);

    if (tempFilePath) {
      deleteFile(tempFilePath);
    }

    return res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  verifyAadhaarCard,
  verifyPANCard,
  verifyDocument,
  getVerificationById,
  deleteVerification
};
