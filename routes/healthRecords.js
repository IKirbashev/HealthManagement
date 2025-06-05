// routes/healthRecords.js
const express = require('express');
const router = express.Router();
const HealthRecord = require('../models/HealthRecord');
const Document = require('../models/Document');
const RecordType = require('../models/RecordType');
const multer = require('multer');
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Match Documents section (50 MB)
  fileFilter: (req, file, cb) => {
    cb(null, true); // Allow any file type
  },
});

router.post('/types', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Название типа обязательно' });
    const recordType = new RecordType({ userId: req.user.id, name });
    await recordType.save();
    res.status(201).json(recordType);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/types', auth, async (req, res) => {
  const defaultTypes = [
    { name: 'Symptoms', isCustom: false },
    { name: 'DoctorVisit', isCustom: false },
    { name: 'Recommendations', isCustom: false },
    { name: 'Event', isCustom: false },
  ];
  const customTypes = await RecordType.find({ userId: req.user.id });
  res.json([...defaultTypes, ...customTypes]);
});

router.post('/', auth, upload.array('files'), async (req, res) => {
  try {
    const { date, time, type, description, doctorName, eventName } = req.body;
    if (!date || !time || !type) return res.status(400).json({ error: 'Required fields missing' });
    if (new Date(date) > new Date()) return res.status(400).json({ error: 'Date cannot be in future' });

    // Validate record type
    const validTypes = [
      'Symptoms',
      'DoctorVisit',
      'Recommendations',
      'Event',
      ...(await RecordType.find({ userId: req.user.id })).map(t => t.name),
    ];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Недопустимый тип записи' });
    }

    const files = req.files ? req.files.map(file => ({
      filePath: file.filename,
      fileType: file.mimetype,
      originalName: file.originalname,
    })) : [];

    const record = new HealthRecord({
      userId: req.user.id,
      date,
      time,
      type,
      description,
      doctorName,
      eventName,
      files,
    });
    await record.save();

    for (const file of files) {
      const document = new Document({
        userId: req.user.id,
        name: file.originalName,
        filePath: file.filePath,
        fileType: file.fileType,
        relatedRecordId: record._id,
      });
      await document.save();
    }

    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  const records = await HealthRecord.find({ userId: req.user.id }).sort({ date: 1 });
  res.json(records);
});

router.put('/:id', auth, upload.array('files'), async (req, res) => {
  try {
    const record = await HealthRecord.findById(req.params.id);
    if (!record || record.userId !== req.user.id) return res.status(404).json({ error: 'Record not found' });

    const { date, time, type, description, doctorName, eventName } = req.body;
    if (!date || !time || !type) return res.status(400).json({ error: 'Required fields missing' });

    // Validate record type
    const validTypes = [
      'Symptoms',
      'DoctorVisit',
      'Recommendations',
      'Event',
      ...(await RecordType.find({ userId: req.user.id })).map(t => t.name),
    ];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Недопустимый тип записи' });
    }

    Object.assign(record, { date, time, type, description, doctorName, eventName });

    if (req.files) {
      const newFiles = req.files.map(file => ({
        filePath: file.filename,
        fileType: file.mimetype,
        originalName: file.originalname,
      }));
      record.files = [...record.files, ...newFiles];
      for (const file of newFiles) {
        const document = new Document({
          userId: req.user.id,
          name: file.originalName,
          filePath: file.filePath,
          fileType: file.fileType,
          relatedRecordId: record._id,
        });
        await document.save();
      }
    }

    await record.save();
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  const record = await HealthRecord.findById(req.params.id);
  if (!record || record.userId !== req.user.id) return res.status(404).json({ error: 'Record not found' });

  // Delete associated files
  for (const file of record.files) {
    const filePath = path.join(__dirname, '../uploads', file.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    await Document.deleteOne({ filePath: file.filePath, relatedRecordId: record._id });
  }

  await record.deleteOne();
  res.json({ message: 'Record deleted' });
});

router.get('/download/:filename', auth, async (req, res) => {
  const filename = req.params.filename;
  const document = await Document.findOne({ filePath: filename, userId: req.user.id });
  if (!document) {
    return res.status(404).json({ error: 'Документ не найден' });
  }

  const filePath = path.join(__dirname, '../uploads', filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Файл не найден на сервере' });
  }

  console.log(`Serving file: ${filePath}, MIME Type: ${document.fileType}, Original Name: ${document.name}`);

  res.setHeader('Content-Type', document.fileType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.name)}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on('error', err => {
    console.error('Stream error:', err);
    res.status(500).json({ error: 'Ошибка при скачивании файла' });
  });
});

module.exports = router;