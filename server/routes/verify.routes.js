/**
 * Verification Routes
 */

const express = require('express');
const router = express.Router();

const {
  verifyAadhaarCard,
  verifyPANCard,
  verifyDocument,
  getVerificationById,
  deleteVerification
} = require('../controllers/verify.controller');

const { protect } = require('../middleware/auth.middleware');
const { upload, handleUploadError, requireFile } = require('../middleware/upload.middleware');

// All routes are protected
router.use(protect);

// Aadhaar verification
router.post('/aadhaar', 
  upload.single('document'), 
  handleUploadError, 
  requireFile, 
  verifyAadhaarCard
);

// PAN verification
router.post('/pan', 
  upload.single('document'), 
  handleUploadError, 
  requireFile, 
  verifyPANCard
);

// Unified document verification (accepts file field name as file or document)
router.post('/document',
  upload.any(),
  handleUploadError,
  verifyDocument
);

// Get verification by ID
router.get('/:id', getVerificationById);

// Delete verification
router.delete('/:id', deleteVerification);

module.exports = router;
