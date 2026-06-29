const express = require('express');
const multer = require('multer');
const router = express.Router();
const { uploadFile } = require('../controllers/uploadController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Use memory storage for multer
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Only doctors should upload prescriptions/reports directly to a patient's record context
router.post('/', authenticateToken, requireRole('doctor'), upload.single('file'), uploadFile);

module.exports = router;
