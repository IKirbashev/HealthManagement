// routes/documents.js
const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const Folder = require('../models/Folder');
const auth = require('../middleware/auth');
const multer = require('multer');
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

const updateFolderLastModified = async (folderId) => {
  if (!folderId) return;
  await Folder.findByIdAndUpdate(folderId, { lastModified: new Date() });
  const folder = await Folder.findById(folderId);
  if (folder && folder.parentId) {
    await updateFolderLastModified(folder.parentId);
  }
};

const updateParentFoldersLastModified = async (parentId) => {
  let currentParentId = parentId;
  while (currentParentId) {
    const parentFolder = await Folder.findById(currentParentId);
    if (!parentFolder) break;
    parentFolder.lastModified = new Date();
    await parentFolder.save();
    currentParentId = parentFolder.parentId;
  }
};

router.post('/folders', auth, async (req, res) => {
  try {
    const { name, parentId } = req.body;
    if (!name) return res.status(400).json({ error: 'Название папки обязательно' });
    const folder = new Folder({ userId: req.user.id, name, parentId: parentId || null, lastModified: new Date() });
    await folder.save();
    if (parentId) {
      await updateFolderLastModified(parentId);
    }
    res.status(201).json(folder);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    folder.lastModified = new Date();
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

  const deleteFolderRecursively = async folderId => {
    const subfolders = await Folder.find({ parentId: folderId });
    for (const subfolder of subfolders) {
      await deleteFolderRecursively(subfolder._id);
    }

    const documents = await Document.find({ folderId: folderId });
    for (const document of documents) {
      const filePath = path.join(__dirname, '../uploads', document.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await Document.deleteOne({ _id: document._id });
    }

    await Folder.deleteOne({ _id: folderId });
  };

  try {
    await deleteFolderRecursively(folder._id);
    if (folder.parentId) {
      await updateFolderLastModified(folder.parentId);
    }
    res.json({ message: 'Папка и её содержимое успешно удалены' });
  } catch (err) {
    console.error('Failed to delete folder:', err);
    res.status(500).json({ error: 'Ошибка при удалении папки' });
  }
});

router.post('/move-folder', auth, async (req, res) => {
  try {
    const { folderId, newParentId } = req.body;
    const folder = await Folder.findById(folderId);
    if (!folder || folder.userId !== req.user.id) {
      return res.status(404).json({ error: 'Папка не найдена' });
    }

    const oldParentId = folder.parentId;

    folder.parentId = newParentId || null;
    folder.lastModified = new Date();
    await folder.save();

    if (oldParentId) {
      await updateFolderLastModified(oldParentId);
    }
    if (newParentId) {
      await updateFolderLastModified(newParentId);
    }

    res.json({ message: 'Папка успешно перемещена' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/move-document', auth, async (req, res) => {
  try {
    const { documentId, newFolderId } = req.body;
    const document = await Document.findById(documentId);
    if (!document || document.userId !== req.user.id) {
      return res.status(404).json({ error: 'Документ не найден' });
    }

    const oldFolderId = document.folderId;

    document.folderId = newFolderId || null;
    await document.save();

    if (oldFolderId) {
      await updateFolderLastModified(oldFolderId);
    }
    if (newFolderId) {
      await updateFolderLastModified(newFolderId);
    }

    res.json({ message: 'Документ успешно перемещён' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload-multiple', auth, upload.array('files'), async (req, res) => {
  try {
    const { folderId, names } = req.body;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Файлы обязательны' });
    }

    const nameArray = Array.isArray(names) ? names : [names];

    if (nameArray.length !== req.files.length) {
      return res.status(400).json({ error: 'Количество имен не совпадает с количеством файлов' });
    }

    const newDocuments = await Promise.all(req.files.map(async (file, index) => {
      const document = new Document({
        userId: req.user.id,
        name: nameArray[index] || iconv.decode(Buffer.from(file.originalname, 'binary'), 'utf8'),
        filePath: file.filename,
        fileType: file.mimetype,
        folderId: folderId || null,
      });
      await document.save();
      return document;
    }));

    if (folderId) {
      await updateFolderLastModified(folderId);
    }

    res.status(201).json(newDocuments);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    const { name, folderId } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Файл обязателен' });
    const document = new Document({
      userId: req.user.id,
      name: name || iconv.decode(Buffer.from(req.file.originalname, 'binary'), 'utf8'),
      filePath: req.file.filename,
      fileType: req.file.mimetype,
      folderId: folderId || null,
    });
    await document.save();
    if (folderId) {
      await updateFolderLastModified(folderId);
    }
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
  const folderId = document.folderId;
  const filePath = path.join(__dirname, '../uploads', document.filePath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  await document.deleteOne();
  if (folderId) {
    await updateFolderLastModified(folderId);
  }
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