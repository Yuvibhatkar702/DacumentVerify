/**
 * Cleanup Utility - Automatically delete old uploaded documents
 */

const fs = require('fs');
const path = require('path');
const Document = require('../models/Document.model');

/**
 * Clean up old documents from filesystem and database
 */
const cleanupOldDocuments = async () => {
  try {
    const hoursToRetain = parseInt(process.env.DOCUMENT_RETENTION_HOURS) || 24;
    const cutoffDate = new Date(Date.now() - hoursToRetain * 60 * 60 * 1000);
    
    console.log(`Cleaning up documents older than ${cutoffDate.toISOString()}`);
    
    // Find old documents
    const oldDocuments = await Document.find({
      createdAt: { $lt: cutoffDate }
    });
    
    let deletedFiles = 0;
    let deletedRecords = 0;
    
    for (const doc of oldDocuments) {
      // Delete file from filesystem
      if (doc.filePath && fs.existsSync(doc.filePath)) {
        try {
          fs.unlinkSync(doc.filePath);
          deletedFiles++;
        } catch (err) {
          console.error(`Failed to delete file: ${doc.filePath}`, err.message);
        }
      }
      
      // Delete database record
      await Document.findByIdAndDelete(doc._id);
      deletedRecords++;
    }
    
    console.log(`Cleanup complete: ${deletedFiles} files, ${deletedRecords} records deleted`);
    
    // Also clean up orphaned files in temp directory
    await cleanupTempDirectory();
    
    return { deletedFiles, deletedRecords };
    
  } catch (error) {
    console.error('Cleanup error:', error);
    return { error: error.message };
  }
};

/**
 * Clean up temporary directory
 */
const cleanupTempDirectory = async () => {
  const tempDir = path.join(process.env.UPLOAD_PATH || './uploads', 'temp');
  
  if (!fs.existsSync(tempDir)) {
    return;
  }
  
  const files = fs.readdirSync(tempDir);
  const now = Date.now();
  const maxAge = 2 * 60 * 60 * 1000; // 2 hours for temp files
  
  for (const file of files) {
    const filePath = path.join(tempDir, file);
    try {
      const stats = fs.statSync(filePath);
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`Deleted temp file: ${file}`);
      }
    } catch (err) {
      // Ignore errors for individual files
    }
  }
};

/**
 * Delete a specific file
 */
const deleteFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Failed to delete file: ${filePath}`, error.message);
    return false;
  }
};

module.exports = {
  cleanupOldDocuments,
  cleanupTempDirectory,
  deleteFile
};
