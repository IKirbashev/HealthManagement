// routes/ocr.js
const express = require('express');
const router = express.Router();
const Tesseract = require('tesseract.js');
const multer = require('multer');
const auth = require('../middleware/auth');
const Document = require('../models/Document');

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

router.post('/', auth, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'PDF file required' });
    const { text } = await Tesseract.recognize(req.file.path, 'eng');
    const extracted = { name: '', value: 0, unit: '' };
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.includes('Глюкоза') || line.includes('Glucose')) {
        extracted.name = 'Глюкоза';
        const parts = line.split(/[:\s]+/);
        extracted.value = parseFloat(parts[1]) || 0;
        extracted.unit = parts[2]?.match(/[a-zA-Z\/]+/)?.[0] || '';
      }
    }
    const document = new Document({
      userId: req.user.id,
      name: req.file.originalname,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      category: 'Анализы',
    });
    await document.save();
    res.json({ extracted, documentId: document._id });
  } catch (err) {
    res.status(500).json({ error: 'OCR processing failed' });
  }
});

module.exports = router;