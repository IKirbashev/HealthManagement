const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const Biomarker = require('../models/Biomarker');
const BiomarkerUnit = require('../models/BiomarkerUnit');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Только PDF-файлы поддерживаются для загрузки'), false);
    }
  }
});

// Middleware to verify token
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Сессия истекла. Пожалуйста, войдите снова.' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Недействительный токен' });
    req.user = user;
    next();
  });
};

// Create a new biomarker result
router.post('/biomarkers', authenticateToken, async (req, res) => {
  try {
    const { name, date, value, unit, comments } = req.body;

    if (!name || !date || !value || !unit) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }
    if (value <= 0 || value.toString().length > 6) {
      return res.status(400).json({ error: 'Значение должно быть положительным и не превышать 6 цифр' });
    }
    if (new Date(date) > new Date()) {
      return res.status(400).json({ error: 'Дата не может быть в будущем' });
    }

    const biomarker = new Biomarker({
      name,
      date,
      value,
      unit,
      comments: comments || '',
      userId: req.user.id
    });
    await biomarker.save();

    res.status(201).json(biomarker);
  } catch (err) {
    console.error('Failed to create biomarker:', err);
    res.status(500).json({ error: 'Ошибка при создании биомаркера' });
  }
});

// Upload and process PDF for OCR
router.post('/biomarkers/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Пожалуйста, выберите файл для загрузки' });
    }

    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    // Simple OCR parsing (to be improved based on actual document structure)
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    let extracted = { name: '', value: '', unit: '', date: new Date().toISOString().split('T')[0] };

    for (let line of lines) {
      if (line.includes('глюкоза') || line.includes('холестерин') || line.includes('apoB') || line.includes('Lp(a)') || line.includes('гемоглобин') || line.includes('креатинин')) {
        extracted.name = line.split(' ')[0];
      }
      if (!isNaN(parseFloat(line.split(' ')[0]))) {
        extracted.value = parseFloat(line.split(' ')[0]);
        extracted.unit = line.split(' ').slice(1).find(word => word.match(/мг\/дл|мм рт\. ст\.|г\/л|мкмоль\/л/)) || '';
      }
    }

    // Prepare data for confirmation
    const biomarkerData = {
      name: extracted.name || '',
      date: extracted.date,
      value: extracted.value || '',
      unit: extracted.unit || '',
      comments: ''
    };

    res.status(200).json({ data: biomarkerData, filePath: req.file.path });
  } catch (err) {
    console.error('Failed to process PDF:', err);
    res.status(500).json({ error: 'Ошибка при обработке PDF' });
  }
});

// Confirm OCR data and save
router.post('/biomarkers/confirm', authenticateToken, async (req, res) => {
  try {
    const { name, date, value, unit, comments, filePath } = req.body;

    if (!name || !date || !value || !unit) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }
    if (value <= 0 || value.toString().length > 6) {
      return res.status(400).json({ error: 'Значение должно быть положительным и не превышать 6 цифр' });
    }
    if (new Date(date) > new Date()) {
      return res.status(400).json({ error: 'Дата не может быть в будущем' });
    }

    const biomarker = new Biomarker({
      name,
      date,
      value,
      unit,
      comments: comments || '',
      userId: req.user.id
    });
    await biomarker.save();

    // Move file to Documents "Анализы" folder
    await axios.post('http://localhost:3000/api/documents', {
      name: `${name}_${date}.pdf`,
      folder: 'Анализы',
      file: filePath
    }, {
      headers: { Authorization: `Bearer ${req.headers['authorization'].split(' ')[1]}` }
    });

    fs.unlinkSync(filePath); // Remove temporary file
    res.status(201).json(biomarker);
  } catch (err) {
    console.error('Failed to confirm biomarker:', err);
    res.status(500).json({ error: 'Ошибка при сохранении биомаркера' });
  }
});

// Get all biomarkers for a user
router.get('/biomarkers', authenticateToken, async (req, res) => {
  try {
    const biomarkers = await Biomarker.find({ userId: req.user.id }).sort({ date: -1 });
    res.status(200).json(biomarkers);
  } catch (err) {
    console.error('Failed to fetch biomarkers:', err);
    res.status(500).json({ error: 'Ошибка при получении биомаркеров' });
  }
});

// Get biomarker by name
router.get('/biomarkers/:name', authenticateToken, async (req, res) => {
  try {
    const biomarkers = await Biomarker.find({ userId: req.user.id, name: req.params.name }).sort({ date: -1 });
    if (!biomarkers.length) {
      return res.status(404).json({ error: 'Биомаркер не найден' });
    }
    res.status(200).json(biomarkers);
  } catch (err) {
    console.error('Failed to fetch biomarker:', err);
    res.status(500).json({ error: 'Ошибка при получении биомаркера' });
  }
});

// Update biomarker
router.put('/biomarkers/:id', authenticateToken, async (req, res) => {
  try {
    const { name, date, value, unit, comments } = req.body;

    if (!name || !date || !value || !unit) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }
    if (value <= 0 || value.toString().length > 6) {
      return res.status(400).json({ error: 'Значение должно быть положительным и не превышать 6 цифр' });
    }
    if (new Date(date) > new Date()) {
      return res.status(400).json({ error: 'Дата не может быть в будущем' });
    }

    const biomarker = await Biomarker.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { name, date, value, unit, comments: comments || '' },
      { new: true, runValidators: true }
    );
    if (!biomarker) {
      return res.status(404).json({ error: 'Биомаркер не найден' });
    }
    res.status(200).json(biomarker);
  } catch (err) {
    console.error('Failed to update biomarker:', err);
    res.status(500).json({ error: 'Ошибка при обновлении биомаркера' });
  }
});

// Delete biomarker
router.delete('/biomarkers/:id', authenticateToken, async (req, res) => {
  try {
    const biomarker = await Biomarker.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!biomarker) {
      return res.status(404).json({ error: 'Биомаркер не найден' });
    }
    res.status(200).json({ message: 'Биомаркер успешно удалён' });
  } catch (err) {
    console.error('Failed to delete biomarker:', err);
    res.status(500).json({ error: 'Ошибка при удалении биомаркера' });
  }
});

// Manage biomarker units
router.post('/biomarker-units', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.length > 20) {
      return res.status(400).json({ error: 'Название единицы должно быть не более 20 символов и не пустым' });
    }
    const unit = new BiomarkerUnit({ name, userId: req.user.id });
    await unit.save();
    res.status(201).json(unit);
  } catch (err) {
    console.error('Failed to create biomarker unit:', err);
    res.status(500).json({ error: 'Ошибка при создании единицы измерения' });
  }
});

router.put('/biomarker-units/:id', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.length > 20) {
      return res.status(400).json({ error: 'Название единицы должно быть не более 20 символов и не пустым' });
    }
    const unit = await BiomarkerUnit.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { name },
      { new: true, runValidators: true }
    );
    if (!unit) {
      return res.status(404).json({ error: 'Единица измерения не найдена' });
    }
    res.status(200).json(unit);
  } catch (err) {
    console.error('Failed to update biomarker unit:', err);
    res.status(500).json({ error: 'Ошибка при обновлении единицы измерения' });
  }
});

router.delete('/biomarker-units/:id', authenticateToken, async (req, res) => {
  try {
    const unit = await BiomarkerUnit.findOne({ _id: req.params.id, userId: req.user.id });
    if (!unit) {
      return res.status(404).json({ error: 'Единица измерения не найдена' });
    }
    const hasBiomarkers = await Biomarker.findOne({ unit: unit.name, userId: req.user.id });
    if (hasBiomarkers) {
      return res.status(400).json({ error: 'Нельзя удалить единицу, так как она используется в результатах' });
    }
    await BiomarkerUnit.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Единица измерения успешно удалена' });
  } catch (err) {
    console.error('Failed to delete biomarker unit:', err);
    res.status(500).json({ error: 'Ошибка при удалении единицы измерения' });
  }
});

router.get('/biomarker-units', authenticateToken, async (req, res) => {
  try {
    const units = await BiomarkerUnit.find({ userId: req.user.id });
    res.status(200).json(units);
  } catch (err) {
    console.error('Failed to fetch biomarker units:', err);
    res.status(500).json({ error: 'Ошибка при получении единиц измерения' });
  }
});

module.exports = router;