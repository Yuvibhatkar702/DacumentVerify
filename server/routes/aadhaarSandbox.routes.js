/**
 * Aadhaar Sandbox Routes
 */

const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const {
  generateAadhaarOTP,
  verifyAadhaarOTP
} = require('../controllers/aadhaarSandboxController');

router.use(protect);

router.post('/send-otp', generateAadhaarOTP);
router.post('/verify-otp', verifyAadhaarOTP);

module.exports = router;
