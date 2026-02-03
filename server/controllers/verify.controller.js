/**
 * Verification Controller
 * Handles document verification for Aadhaar and PAN cards
 */

const path = require('path');
const fs = require('fs');
const Document = require('../models/Document.model');
const { verifyAadhaar } = require('../utils/aadhaarVerification.util');
const { verifyPAN } = require('../utils/panVerification.util');
const { generateFileHash } = require('../utils/hash.util');
const { deleteFile } = require('../utils/cleanup');
const { documentsDir } = require('../middleware/upload.middleware');

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

module.exports = {
  verifyAadhaarCard,
  verifyPANCard,
  getVerificationById,
  deleteVerification
};
