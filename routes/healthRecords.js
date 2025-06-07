// routes/healthRecords.js
const express = require('express');
const router = express.Router();
const HealthRecord = require('../models/HealthRecord');
const Document = require('../models/Document');
const RecordType = require('../models/RecordType');
const Folder = require('../models/Folder');
const multer = require('multer');
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const iconv = require('iconv-lite');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const originalName = iconv.decode(Buffer.from(file.originalname, 'binary'), 'utf8');
    let filePath = path.join('uploads', originalName);
    let newName = originalName;
    let counter = 1;

    while (fs.existsSync(filePath)) {
      const ext = path.extname(originalName);
      const baseName = path.basename(originalName, ext);
      newName = `${baseName}-${Date.now()}${ext}`;
      filePath = path.join('uploads', newName);
      counter++;
    }

    cb(null, newName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
});

router.post('/types', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Название типа обязательно' });

    const existingType = await RecordType.findOne({ userId: req.user.id, name });
    if (existingType) return res.status(400).json({ error: 'Тип с таким названием уже существует' });

    const recordType = new RecordType({ userId: req.user.id, name });
    await recordType.save();
    res.status(201).json(recordType);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/types', auth, async (req, res) => {
  const defaultTypes = ['Симптомы', 'Визит к врачу', 'Рекомендации', 'Событие'];

  for (const typeName of defaultTypes) {
    const existingType = await RecordType.findOne({ userId: req.user.id, name: typeName });
    if (!existingType) {
      const newType = new RecordType({ userId: req.user.id, name: typeName });
      await newType.save();
    }
  }

  const types = await RecordType.find({ userId: req.user.id });
  res.json(types);
});

router.put('/types/:id', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Название типа обязательно' });

    const recordType = await RecordType.findById(req.params.id);
    if (!recordType || recordType.userId !== req.user.id) {
      return res.status(404).json({ error: 'Тип записи не найден' });
    }

    const existingType = await RecordType.findOne({ userId: req.user.id, name, _id: { $ne: req.params.id } });
    if (existingType) return res.status(400).json({ error: 'Тип с таким названием уже существует' });

    const oldName = recordType.name;
    recordType.name = name;
    await recordType.save();

    await HealthRecord.updateMany(
      { userId: req.user.id, type: oldName },
      { $set: { type: name } }
    );

    res.json(recordType);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/types/:id', auth, async (req, res) => {
  try {
    const recordType = await RecordType.findById(req.params.id);
    if (!recordType || recordType.userId !== req.user.id) {
      return res.status(404).json({ error: 'Тип записи не найден' });
    }

    const recordsUsingType = await HealthRecord.findOne({ userId: req.user.id, type: recordType.name });
    if (recordsUsingType) {
      return res.status(400).json({ error: 'Нельзя удалить тип, который используется в записях' });
    }

    await recordType.deleteOne();
    res.json({ message: 'Тип записи удалён' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/', auth, upload.array('files'), async (req, res) => {
  try {
    const { date, time, type, description } = req.body;
    if (!date || !time || !type) return res.status(400).json({ error: 'Required fields missing' });
    if (new Date(date) > new Date()) return res.status(400).json({ error: 'Date cannot be in future' });

    const validTypes = (await RecordType.find({ userId: req.user.id })).map(t => t.name);
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Недопустимый тип записи' });
    }

    // Проверяем или создаём папку "Записи о здоровье"
    let healthRecordsFolder = await Folder.findOne({ userId: req.user.id, name: 'Записи о здоровье', parentId: null });
    if (!healthRecordsFolder) {
      healthRecordsFolder = new Folder({ userId: req.user.id, name: 'Записи о здоровье', parentId: null });
      await healthRecordsFolder.save();
      setFolders([...folders, healthRecordsFolder]); // Обновляем список папок (если фронтенд доступен)
    }

    const files = req.files ? req.files.map(file => ({
      filePath: file.filename,
      fileType: file.mimetype,
      originalName: iconv.decode(Buffer.from(file.originalname, 'binary'), 'utf8'),
    })) : [];

    const record = new HealthRecord({
      userId: req.user.id,
      date,
      time,
      type,
      description,
      files,
    });
    await record.save();

    for (const file of files) {
      const document = new Document({
        userId: req.user.id,
        name: file.originalName,
        filePath: file.filePath,
        fileType: file.fileType,
        folderId: healthRecordsFolder._id,
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
  const { sort } = req.query;
  const sortOption = sort === 'asc' ? { date: 1 } : { date: -1 };
  const records = await HealthRecord.find({ userId: req.user.id }).sort(sortOption);
  res.json(records);
});

router.put('/:id', auth, upload.array('files'), async (req, res) => {
  try {
    const record = await HealthRecord.findById(req.params.id);
    if (!record || record.userId !== req.user.id) return res.status(404).json({ error: 'Record not found' });

    const { date, time, type, description, filesToDelete } = req.body;
    if (!date || !time || !type) return res.status(400).json({ error: 'Required fields missing' });

    const validTypes = (await RecordType.find({ userId: req.user.id })).map(t => t.name);
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Недопустимый тип записи' });
    }

    record.date = date;
    record.time = time;
    record.type = type;
    record.description = description;

    let filesToDeleteArray = [];
    try {
      filesToDeleteArray = filesToDelete ? JSON.parse(filesToDelete) : [];
    } catch (err) {
      return res.status(400).json({ error: 'Invalid filesToDelete format' });
    }

    if (filesToDeleteArray.length > 0) {
      for (const filePath of filesToDeleteArray) {
        const fileIndex = record.files.findIndex(file => file.filePath === filePath);
        if (fileIndex !== -1) {
          const file = record.files[fileIndex];
          const fullPath = path.join(__dirname, '../uploads', file.filePath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
          await Document.deleteOne({ filePath: file.filePath, relatedRecordId: record._id });
          record.files.splice(fileIndex, 1);
        }
      }
    }

    if (req.files && req.files.length > 0) {
      const newFiles = req.files.map(file => ({
        filePath: file.filename,
        fileType: file.mimetype,
        originalName: iconv.decode(Buffer.from(file.originalname, 'binary'), 'utf8'),
      }));
      record.files = record.files ? [...record.files, ...newFiles] : newFiles;

      let healthRecordsFolder = await Folder.findOne({ userId: req.user.id, name: 'Записи о здоровье', parentId: null });
      if (!healthRecordsFolder) {
        healthRecordsFolder = new Folder({ userId: req.user.id, name: 'Записи о здоровье', parentId: null });
        await healthRecordsFolder.save();
      }

      for (const file of newFiles) {
        const document = new Document({
          userId: req.user.id,
          name: file.originalName,
          filePath: file.filePath,
          fileType: file.fileType,
          folderId: healthRecordsFolder._id,
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