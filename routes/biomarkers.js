// routes/biomarkers.js
const express = require('express');
const router = express.Router();
const { Biomarker, BiomarkerResult } = require('../models/Biomarker');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
    const { name, date, value, unit, comments } = req.body;
    if (!name || !date || !value || !unit) return res.status(400).json({ error: 'Required fields missing' });
    let biomarker = await Biomarker.findOne({ userId: req.user.id, name });
    if (!biomarker) {
      biomarker = new Biomarker({ userId: req.user.id, name, isCustom: true });
      await biomarker.save();
    }
    const result = new BiomarkerResult({
      biomarkerId: biomarker._id,
      userId: req.user.id,
      date,
      value,
      unit,
      comments,
    });
    await result.save();
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  const results = await BiomarkerResult.find({ userId: req.user.id })
    .populate('biomarkerId')
    .sort({ date: 1 });
  res.json(results);
});

router.put('/:id', auth, async (req, res) => {
  try {
    const result = await BiomarkerResult.findById(req.params.id);
    if (!result || result.userId !== req.user.id) return res.status(404).json({ error: 'Result not found' });
    Object.assign(result, req.body);
    await result.save();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  const result = await BiomarkerResult.findById(req.params.id);
  if (!result || result.userId !== req.user.id) return res.status(404).json({ error: 'Result not found' });
  await result.deleteOne();
  res.json({ message: 'Result deleted' });
});

module.exports = router;