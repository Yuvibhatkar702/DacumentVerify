/**
 * History Routes
 */

const express = require('express');
const router = express.Router();

const {
  getHistory,
  getStats,
  getRecent
} = require('../controllers/history.controller');

const { protect } = require('../middleware/auth.middleware');

// All routes are protected
router.use(protect);

// Get verification history
router.get('/', getHistory);

// Get dashboard statistics
router.get('/stats', getStats);

// Get recent verifications
router.get('/recent', getRecent);

module.exports = router;
