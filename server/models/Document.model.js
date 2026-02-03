/**
 * Document Model - MongoDB Schema for Verification Records
 */

const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  documentType: {
    type: String,
    required: [true, 'Document type is required'],
    enum: ['aadhaar', 'pan'],
    lowercase: true
  },
  originalFileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileHash: {
    type: String,
    required: true,
    index: true
  },
  extractedData: {
    // Common fields
    name: { type: String, default: null },
    dateOfBirth: { type: String, default: null },
    gender: { type: String, default: null },
    
    // Aadhaar specific
    aadhaarNumber: { type: String, default: null },
    address: { type: String, default: null },
    qrCodeData: { type: mongoose.Schema.Types.Mixed, default: null },
    
    // PAN specific
    panNumber: { type: String, default: null },
    fatherName: { type: String, default: null },
    
    // Raw OCR text
    rawText: { type: String, default: null }
  },
  verificationDetails: {
    // Validation results
    numberValid: { type: Boolean, default: false },
    formatValid: { type: Boolean, default: false },
    qrCodeFound: { type: Boolean, default: false },
    qrDataMatches: { type: Boolean, default: false },
    checksumValid: { type: Boolean, default: false },
    
    // Additional checks
    tamperingDetected: { type: Boolean, default: false },
    imageQuality: { type: String, enum: ['poor', 'fair', 'good', 'excellent'], default: 'fair' },
    
    // Detailed messages
    validationMessages: [{ type: String }]
  },
  confidenceScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  status: {
    type: String,
    required: true,
    enum: ['verified', 'suspicious', 'rejected', 'pending', 'processing'],
    default: 'pending'
  },
  processingTime: {
    type: Number, // in milliseconds
    default: 0
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Document expires after 24 hours
      const hours = parseInt(process.env.DOCUMENT_RETENTION_HOURS) || 24;
      return new Date(Date.now() + hours * 60 * 60 * 1000);
    },
    index: { expires: 0 } // TTL index - MongoDB auto-deletes expired documents
  }
}, {
  timestamps: true
});

// Compound index for user queries
documentSchema.index({ userId: 1, createdAt: -1 });
documentSchema.index({ userId: 1, documentType: 1 });

// Virtual for formatted status display
documentSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    verified: '✅ Verified',
    suspicious: '⚠️ Suspicious',
    rejected: '❌ Rejected',
    pending: '⏳ Pending',
    processing: '🔄 Processing'
  };
  return statusMap[this.status] || this.status;
});

// Method to get summary
documentSchema.methods.getSummary = function() {
  return {
    id: this._id,
    documentType: this.documentType,
    status: this.status,
    confidenceScore: this.confidenceScore,
    extractedNumber: this.documentType === 'aadhaar' 
      ? this.extractedData.aadhaarNumber 
      : this.extractedData.panNumber,
    createdAt: this.createdAt
  };
};

// Static method to get user statistics
documentSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = {
    total: 0,
    verified: 0,
    suspicious: 0,
    rejected: 0,
    pending: 0
  };
  
  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });
  
  return result;
};

module.exports = mongoose.model('Document', documentSchema);
