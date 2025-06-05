// routes/medications.js
const express = require('express');
const router = express.Router();
const { Medication } = require('../models/Medication');
const auth = require('../middleware/auth');
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:your@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

router.post('/', auth, async (req, res) => {
  try {
    const { name, dosageValue, dosageUnit, times, periodicityValue, periodicityUnit, startDate, endDate, notes } = req.body;
    if (!name || !dosageValue || !dosageUnit || !times || !periodicityValue || !periodicityUnit || !startDate) {
      return res.status(400).json({ error: 'Required fields missing' });
    }
    const medication = new Medication({
      userId: req.user.id,
      name,
      dosageValue,
      dosageUnit,
      times,
      periodicityValue,
      periodicityUnit,
      startDate,
      endDate,
      notes,
      isActive: true,
    });
    await medication.save();
    res.status(201).json(medication);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  const medications = await Medication.find({ userId: req.user.id });
  res.json(medications);
});

router.put('/:id', auth, async (req, res) => {
  try {
    const medication = await Medication.findById(req.params.id);
    if (!medication || medication.userId !== req.user.id) return res.status(404).json({ error: 'Medication not found' });
    Object.assign(medication, req.body);
    await medication.save();
    res.json(medication);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id/archive', auth, async (req, res) => {
  const medication = await Medication.findById(req.params.id);
  if (!medication || medication.userId !== req.user.id) return res.status(404).json({ error: 'Medication not found' });
  medication.isActive = false;
  await medication.save();
  res.json({ message: 'Medication archived' });
});

router.delete('/:id', auth, async (req, res) => {
  const medication = await Medication.findById(req.params.id);
  if (!medication || medication.userId !== req.user.id) return res.status(404).json({ error: 'Medication not found' });
  await medication.deleteOne();
  res.json({ message: 'Medication deleted' });
});

router.post('/:id/notify', auth, async (req, res) => {
  const medication = await Medication.findById(req.params.id);
  if (!medication || medication.userId !== req.user.id) return res.status(404).json({ error: 'Medication not found' });
  const payload = JSON.stringify({
    title: `Напоминание: ${medication.name}`,
    body: `Пора принять ${medication.dosageValue} ${medication.dosageUnit}`,
  });
  try {
    // Placeholder: Requires subscription data from Service Worker
    await webpush.sendNotification(req.body.subscription, payload);
    res.json({ message: 'Notification sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

module.exports = router;