/**
 * File Hash Utility - Generate unique hashes for documents
 */

const crypto = require('crypto');
const fs = require('fs');

/**
 * Generate SHA-256 hash of a file
 */
const generateFileHash = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', err => reject(err));
  });
};

/**
 * Generate hash from buffer
 */
const generateBufferHash = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Generate short hash (first 16 characters)
 */
const generateShortHash = async (filePath) => {
  const fullHash = await generateFileHash(filePath);
  return fullHash.substring(0, 16);
};

module.exports = {
  generateFileHash,
  generateBufferHash,
  generateShortHash
};
