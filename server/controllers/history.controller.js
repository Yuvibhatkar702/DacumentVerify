/**
 * History Controller
 * Handles verification history retrieval and statistics
 */

const Document = require('../models/Document.model');

/**
 * @desc    Get user verification history
 * @route   GET /api/history
 * @access  Private
 */
const getHistory = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      documentType,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query
    const query = { userId: req.user.id };
    
    if (documentType && ['aadhaar', 'pan'].includes(documentType.toLowerCase())) {
      query.documentType = documentType.toLowerCase();
    }
    
    if (status && ['verified', 'suspicious', 'rejected', 'pending'].includes(status.toLowerCase())) {
      query.status = status.toLowerCase();
    }
    
    // Calculate pagination
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 10, 50); // Max 50 per page
    const skip = (pageNum - 1) * limitNum;
    
    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Execute query
    const [documents, totalCount] = await Promise.all([
      Document.find(query)
        .select('-filePath -extractedData.rawText -ipAddress -userAgent')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Document.countDocuments(query)
    ]);
    
    // Mask sensitive data in results
    const maskedDocuments = documents.map(doc => {
      const masked = { ...doc };
      
      if (doc.documentType === 'aadhaar' && doc.extractedData?.aadhaarNumber) {
        masked.extractedData = {
          ...doc.extractedData,
          aadhaarNumber: 'XXXX XXXX ' + doc.extractedData.aadhaarNumber.slice(-4)
        };
      }
      
      return {
        id: masked._id,
        documentType: masked.documentType,
        originalFileName: masked.originalFileName,
        status: masked.status,
        confidenceScore: masked.confidenceScore,
        extractedData: {
          name: masked.extractedData?.name,
          panNumber: masked.extractedData?.panNumber,
          aadhaarNumber: masked.extractedData?.aadhaarNumber
        },
        verificationDetails: {
          imageQuality: masked.verificationDetails?.imageQuality,
          numberValid: masked.verificationDetails?.numberValid
        },
        processingTime: masked.processingTime,
        createdAt: masked.createdAt
      };
    });
    
    res.status(200).json({
      success: true,
      data: {
        documents: maskedDocuments,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalRecords: totalCount,
          recordsPerPage: limitNum,
          hasNextPage: pageNum * limitNum < totalCount,
          hasPrevPage: pageNum > 1
        }
      }
    });
    
  } catch (error) {
    console.error('Get History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve verification history'
    });
  }
};

/**
 * @desc    Get user dashboard statistics
 * @route   GET /api/history/stats
 * @access  Private
 */
const getStats = async (req, res) => {
  try {
    // Get overall stats
    const stats = await Document.getUserStats(req.user.id);
    
    // Get document type breakdown
    const typeBreakdown = await Document.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$documentType',
          count: { $sum: 1 },
          verified: {
            $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] }
          },
          suspicious: {
            $sum: { $cond: [{ $eq: ['$status', 'suspicious'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      }
    ]);
    
    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentActivity = await Document.aggregate([
      {
        $match: {
          userId: req.user._id,
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get average confidence score
    const avgConfidence = await Document.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: null,
          avgConfidence: { $avg: '$confidenceScore' },
          avgProcessingTime: { $avg: '$processingTime' }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        overview: {
          total: stats.total,
          verified: stats.verified,
          suspicious: stats.suspicious,
          rejected: stats.rejected,
          pending: stats.pending,
          verificationRate: stats.total > 0 
            ? Math.round((stats.verified / stats.total) * 100) 
            : 0
        },
        byDocumentType: {
          aadhaar: typeBreakdown.find(t => t._id === 'aadhaar') || { count: 0, verified: 0, suspicious: 0, rejected: 0 },
          pan: typeBreakdown.find(t => t._id === 'pan') || { count: 0, verified: 0, suspicious: 0, rejected: 0 }
        },
        recentActivity: recentActivity,
        averages: {
          confidenceScore: avgConfidence[0]?.avgConfidence 
            ? Math.round(avgConfidence[0].avgConfidence) 
            : 0,
          processingTime: avgConfidence[0]?.avgProcessingTime 
            ? Math.round(avgConfidence[0].avgProcessingTime) 
            : 0
        }
      }
    });
    
  } catch (error) {
    console.error('Get Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics'
    });
  }
};

/**
 * @desc    Get recent verifications
 * @route   GET /api/history/recent
 * @access  Private
 */
const getRecent = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 5, 20);
    
    const documents = await Document.find({ userId: req.user.id })
      .select('documentType status confidenceScore extractedData.name extractedData.panNumber extractedData.aadhaarNumber createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    const maskedDocuments = documents.map(doc => ({
      id: doc._id,
      documentType: doc.documentType,
      status: doc.status,
      confidenceScore: doc.confidenceScore,
      name: doc.extractedData?.name,
      documentNumber: doc.documentType === 'pan' 
        ? doc.extractedData?.panNumber
        : doc.extractedData?.aadhaarNumber 
          ? 'XXXX XXXX ' + doc.extractedData.aadhaarNumber.slice(-4)
          : null,
      createdAt: doc.createdAt
    }));
    
    res.status(200).json({
      success: true,
      data: maskedDocuments
    });
    
  } catch (error) {
    console.error('Get Recent Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve recent verifications'
    });
  }
};

module.exports = {
  getHistory,
  getStats,
  getRecent
};
