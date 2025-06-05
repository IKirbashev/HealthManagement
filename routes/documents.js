// routes/documents.js
const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const Folder = require('../models/Folder');
const auth = require('../middleware/auth');
const multer = require('multer');
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
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
});

router.post('/folders', auth, async (req, res) => {
  try {
    const { name, parentId } = req.body;
    if (!name) return res.status(400).json({ error: 'Название папки обязательно' });
    const folder = new Folder({ userId: req.user.id, name, parentId: parentId || null });
    await folder.save();
    res.status(201).json(folder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/folders', auth, async (req, res) => {
  const folders = await Folder.find({ userId: req.user.id });
  res.json(folders);
});

router.put('/folders/:id', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Название папки обязательно' });
    const folder = await Folder.findById(req.params.id);
    if (!folder || folder.userId !== req.user.id) {
      return res.status(404).json({ error: 'Папка не найдена' });
    }
    folder.name = name;
    await folder.save();
    res.json(folder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/folders/:id', auth, async (req, res) => {
  const folder = await Folder.findById(req.params.id);
  if (!folder || folder.userId !== req.user.id) {
    return res.status(404).json({ error: 'Папка не найдена' });
  }

  // Recursive function to delete folder and its contents
  const deleteFolderRecursively = async folderId => {
    // Delete all subfolders
    const subfolders = await Folder.find({ parentId: folderId });
    for (const subfolder of subfolders) {
      await deleteFolderRecursively(subfolder._id);
    }

    // Delete all documents in the folder
    const documents = await Document.find({ folderId: folderId });
    for (const document of documents) {
      const filePath = path.join(__dirname, '../uploads', document.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await Document.deleteOne({ _id: document._id });
    }

    // Delete the folder itself
    await Folder.deleteOne({ _id: folderId });
  };

  try {
    await deleteFolderRecursively(folder._id);
    res.json({ message: 'Папка и её содержимое удалены' });
  } catch (err) {
    console.error('Failed to delete folder:', err);
    res.status(500).json({ error: 'Ошибка при удалении папки' });
  }
});

router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    const { name, folderId } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Файл обязателен' });
    const document = new Document({
      userId: req.user.id,
      name: name || req.file.originalname,
      filePath: req.file.filename,
      fileType: req.file.mimetype,
      folderId: folderId || null,
    });
    await document.save();
    res.status(201).json(document);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  const { folderId } = req.query;
  const query = { userId: req.user.id };
  if (folderId) query.folderId = folderId === 'null' ? null : folderId;
  const documents = await Document.find(query);
  res.json(documents);
});

router.delete('/:id', auth, async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document || document.userId !== req.user.id) {
    return res.status(404).json({ error: 'Документ не найден' });
  }
  const filePath = path.join(__dirname, '../uploads', document.filePath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  await document.deleteOne();
  res.json({ message: 'Документ удален' });
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