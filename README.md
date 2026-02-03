# 📄 Document Verification System

A complete, production-ready **MERN Stack** document verification website that verifies **Aadhaar Card** and **PAN Card** authenticity using OCR technology, QR code scanning, and advanced validation algorithms.

![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![React](https://img.shields.io/badge/React-18.2-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-7.x-green)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-blue)

---

## ✨ Features

### 🔐 Authentication
- JWT-based secure authentication
- User registration with email validation
- Protected routes and dashboard
- Session management with token refresh

### 🪪 Aadhaar Verification
- **12-digit Aadhaar number validation**
- **Verhoeff checksum algorithm** for number authenticity
- **QR code scanning** and data extraction
- **OCR text extraction** using Tesseract.js
- **Cross-validation** between OCR data and QR data
- Confidence score calculation (0-100%)

### 💳 PAN Card Verification
- **Format validation** using regex: `^[A-Z]{5}[0-9]{4}[A-Z]$`
- **Holder type identification** (Individual, Company, Trust, etc.)
- **Name and DOB extraction** via OCR
- **Issuing authority validation**
- Confidence score calculation (0-100%)

### 📊 Verification Results
- **Verified** ✅ (Confidence ≥ 80%)
- **Suspicious** ⚠️ (Confidence 50-79%)
- **Rejected** ❌ (Confidence < 50%)

### 🔒 Security Features
- Document hash generation for duplicate detection
- Auto-delete uploaded files (scheduled cleanup)
- TTL indexes for document expiration
- Secure file upload with type validation
- Input sanitization and XSS protection

### 📜 Verification History
- Complete history of all verifications
- Filter by document type and status
- Detailed view with extracted data
- Pagination support

---

## 🛠️ Technology Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18.x | Runtime environment |
| Express.js | 4.18.2 | Web framework |
| MongoDB | 7.x | Database |
| Mongoose | 8.0.3 | ODM |
| JWT | 9.0.2 | Authentication |
| Tesseract.js | 5.0.4 | OCR processing |
| jsQR | 1.4.0 | QR code scanning |
| Sharp | 0.33.1 | Image processing |
| Multer | 1.4.5 | File uploads |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.0 | UI framework |
| Tailwind CSS | 3.4.0 | Styling |
| React Router | 6.21.1 | Routing |
| Axios | 1.6.2 | HTTP client |
| Framer Motion | 10.16.16 | Animations |
| react-dropzone | 14.2.3 | File upload UI |
| react-hot-toast | 2.4.1 | Notifications |

---

## 📁 Project Structure

```
Verification/
├── server/                     # Backend
│   ├── controllers/            # Route handlers
│   │   ├── auth.controller.js
│   │   ├── verify.controller.js
│   │   └── history.controller.js
│   ├── middleware/             # Express middleware
│   │   ├── auth.middleware.js
│   │   ├── upload.middleware.js
│   │   └── validation.middleware.js
│   ├── models/                 # Mongoose models
│   │   ├── User.model.js
│   │   └── Document.model.js
│   ├── routes/                 # API routes
│   │   ├── auth.routes.js
│   │   ├── verify.routes.js
│   │   └── history.routes.js
│   ├── utils/                  # Utility functions
│   │   ├── ocr.util.js
│   │   ├── qrScanner.util.js
│   │   ├── aadhaarVerification.util.js
│   │   ├── panVerification.util.js
│   │   ├── hash.util.js
│   │   └── cleanup.js
│   ├── uploads/                # Temporary file storage
│   ├── .env                    # Environment variables
│   ├── .env.example            # Example env file
│   ├── package.json
│   └── server.js               # Entry point
│
├── client/                     # Frontend
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   └── ProtectedRoute.js
│   │   │   ├── common/
│   │   │   │   ├── LoadingSpinner.js
│   │   │   │   ├── StatusBadge.js
│   │   │   │   ├── ConfidenceScore.js
│   │   │   │   ├── FileDropzone.js
│   │   │   │   ├── ScanningAnimation.js
│   │   │   │   └── VerificationResult.js
│   │   │   └── layout/
│   │   │       ├── Navbar.js
│   │   │       ├── Footer.js
│   │   │       └── Layout.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── LandingPage.js
│   │   │   ├── LoginPage.js
│   │   │   ├── SignupPage.js
│   │   │   ├── Dashboard.js
│   │   │   ├── AadhaarVerification.js
│   │   │   ├── PANVerification.js
│   │   │   ├── HistoryPage.js
│   │   │   └── NotFound.js
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── verification.service.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── .env
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
│
└── README.md
```

---

## 🚀 Setup Instructions

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.x or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v7.x or higher) - [Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **npm** (comes with Node.js) or **yarn**

### Step 1: Clone/Download the Project

If you downloaded the project, extract it to your desired location.

### Step 2: MongoDB Setup

#### Option A: Local MongoDB

1. Install MongoDB Community Server
2. Start MongoDB service:
   ```bash
   # Windows
   net start MongoDB

   # macOS
   brew services start mongodb-community

   # Linux
   sudo systemctl start mongod
   ```

#### Option B: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get your connection string (it looks like: `mongodb+srv://username:password@cluster.xxxxx.mongodb.net/`)

### Step 3: Backend Setup

1. **Navigate to the server directory:**
   ```bash
   cd server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   
   The `.env` file is already created. Update it with your values:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/document-verification
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   NODE_ENV=development
   ```
   
   For MongoDB Atlas, replace the `MONGODB_URI` with your Atlas connection string.

4. **Start the backend server:**
   ```bash
   # Development mode (with auto-reload)
   npm run dev

   # OR Production mode
   npm start
   ```

   You should see:
   ```
   🚀 Server running on port 5000
   📦 MongoDB connected successfully
   ```

### Step 4: Frontend Setup

1. **Open a new terminal and navigate to the client directory:**
   ```bash
   cd client
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   
   The `.env` file is already created:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_NAME=DocVerify
   ```

4. **Start the frontend development server:**
   ```bash
   npm start
   ```

   The application will open in your browser at `http://localhost:3000`

### Step 5: Verify Installation

1. Open `http://localhost:3000` in your browser
2. Click "Get Started" or "Sign Up"
3. Create a new account
4. Login and access the dashboard
5. Try verifying a document!

---

## 📝 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/password` | Change password |
| POST | `/api/auth/logout` | Logout user |

### Document Verification

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/verify/aadhaar` | Verify Aadhaar card |
| POST | `/api/verify/pan` | Verify PAN card |
| GET | `/api/verify/status/:id` | Get verification status |

### History

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/history` | Get verification history |
| GET | `/api/history/:id` | Get specific record |
| DELETE | `/api/history/:id` | Delete record |
| GET | `/api/history/stats` | Get statistics |

---

## 🧪 Testing the Application

### Test Aadhaar Verification

1. Upload a clear image of an Aadhaar card (front side with QR code)
2. The system will:
   - Extract text using OCR
   - Scan QR code (if present)
   - Validate the 12-digit Aadhaar number
   - Apply Verhoeff checksum algorithm
   - Cross-validate OCR data with QR data
   - Calculate confidence score

### Test PAN Verification

1. Upload a clear image of a PAN card
2. The system will:
   - Extract text using OCR
   - Validate PAN format (ABCDE1234F)
   - Identify holder type (P=Person, C=Company, etc.)
   - Extract name and other details
   - Calculate confidence score

### Sample Test Data

For testing purposes, you can use:

**Valid Aadhaar Format:** Any 12-digit number that passes Verhoeff checksum
- Example: `234567891234` (Note: Use real documents for actual testing)

**Valid PAN Format:**
- Individual: `ABCDE1234F` (5 letters + 4 digits + 1 letter)
- Company: `AABCC1234C`
- Trust: `AABTT1234T`

---

## ⚙️ Configuration Options

### Backend (.env)

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/document-verification

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# File Upload
MAX_FILE_SIZE=10485760  # 10MB in bytes
```

### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_NAME=DocVerify
```

---

## 🔧 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check if the connection string is correct
   - For Atlas, whitelist your IP address

2. **OCR Not Working**
   - Ensure Tesseract.js is properly installed
   - Upload clear, high-resolution images
   - Supported formats: JPEG, PNG, PDF

3. **CORS Errors**
   - Check if backend is running on port 5000
   - Verify `REACT_APP_API_URL` in frontend `.env`

4. **File Upload Errors**
   - Check file size (max 10MB)
   - Ensure file type is supported
   - Check if `uploads` folder exists

### Logs

- Backend logs appear in the terminal running the server
- Frontend logs appear in browser console (F12)

---

## 🏭 Production Deployment

### Backend

1. Set `NODE_ENV=production` in `.env`
2. Use a strong, unique `JWT_SECRET`
3. Use MongoDB Atlas for cloud database
4. Consider using PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "doc-verify-api"
   ```

### Frontend

1. Build for production:
   ```bash
   npm run build
   ```
2. Deploy the `build` folder to:
   - Netlify
   - Vercel
   - AWS S3 + CloudFront
   - Any static hosting service

---

## 🛡️ Security Considerations

- **Never commit `.env` files** with real credentials
- Use strong JWT secrets in production
- Implement rate limiting for production
- Use HTTPS in production
- Regularly update dependencies
- Uploaded files are auto-deleted after processing

---

## 📄 License

This project is for educational and demonstration purposes.

---

## 🤝 Support

If you encounter any issues or have questions:

1. Check the Troubleshooting section
2. Review the console logs for errors
3. Ensure all dependencies are installed correctly

---

## 🎯 Future Enhancements

- [ ] Add support for more document types (Passport, Driving License)
- [ ] Implement face matching between documents
- [ ] Add bulk verification feature
- [ ] Integrate with government APIs for real-time verification
- [ ] Add multi-language support
- [ ] Implement 2FA authentication
- [ ] Add export functionality for verification reports

---

**Built with ❤️ using MERN Stack**
