/**
 * PAN Verification Routes
 */

const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { upload, handleUploadError, requireFile } = require('../middleware/upload.middleware');
const { verifyPanCard } = require('../controllers/panVerificationController');

// POST /api/verify/pan
router.post('/pan', protect, upload.single('document'), handleUploadError, requireFile, verifyPanCard);

module.exports = router;
