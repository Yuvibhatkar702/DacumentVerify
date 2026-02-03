/**
 * Document Verification System - Main Server Entry Point
 * Express.js server with MongoDB connection and route handling
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

// Import routes
const authRoutes = require('./routes/auth.routes');
const verifyRoutes = require('./routes/verify.routes');
const historyRoutes = require('./routes/history.routes');

// Import utilities
const { cleanupOldDocuments } = require('./utils/cleanup');

const app = express();

// ======================
// MIDDLEWARE CONFIGURATION
// ======================

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files (with authentication middleware in production)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ======================
// DATABASE CONNECTION
// ======================

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// ======================
// API ROUTES
// ======================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Document Verification API is running',
    timestamp: new Date().toISOString()
  });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Document verification routes
app.use('/api/verify', verifyRoutes);

// Verification history routes
app.use('/api/history', historyRoutes);

// ======================
// ERROR HANDLING
// ======================

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ======================
// SCHEDULED TASKS
// ======================

// Run cleanup every hour to remove old uploaded documents
cron.schedule('0 * * * *', async () => {
  console.log('🧹 Running scheduled document cleanup...');
  await cleanupOldDocuments();
});

// ======================
// SERVER STARTUP
// ======================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════╗
    ║   Document Verification API Server           ║
    ╠══════════════════════════════════════════════╣
    ║   🚀 Server running on port: ${PORT}            ║
    ║   📁 Environment: ${process.env.NODE_ENV || 'development'}          ║
    ║   🔗 API URL: http://localhost:${PORT}/api     ║
    ╚══════════════════════════════════════════════╝
    `);
  });
};

startServer();

module.exports = app;
