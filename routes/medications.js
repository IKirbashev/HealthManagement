//routes/medications.js
const express = require('express');
const router = express.Router();
const { Medication, MedicationIntake, DosageUnit } = require('../models/Medication');
const auth = require('../middleware/auth');
const { startOfDay, endOfDay, addDays, addWeeks, addMonths, isAfter, isBefore, isSameDay } = require('date-fns');

// Medication CRUD
router.post('/', auth, async (req, res) => {
  try {
    const { name, dosage, intakeTimes, frequency, startDate, endDate, notes } = req.body;
    
    // Validation
    if (!name || !dosage?.value || !dosage?.unit || !intakeTimes?.length || !frequency?.count || !frequency?.unit || !startDate) {
      return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
    }
    if (intakeTimes.length > 10) {
      return res.status(400).json({ error: 'Максимум 10 времён приёма в день' });
    }
    if (new Date(startDate) > new Date()) {
      return res.status(400).json({ error: 'Дата начала не может быть в будущем' });
    }
    if (endDate && new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ error: 'Дата окончания не может быть раньше даты начала' });
    }
    const validUnits = (await DosageUnit.find({ userId: req.user.id })).map(u => u.name);
    if (!validUnits.includes(dosage.unit)) {
      return res.status(400).json({ error: 'Недопустимая единица измерения' });
    }

    const medication = new Medication({
      userId: req.user.id,
      name,
      dosage,
      intakeTimes,
      frequency,
      startDate,
      endDate,
      notes,
    });
    await medication.save();
    
    // Generate intake records
    await generateIntakeRecords(medication);
    
    res.status(201).json(medication);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  const medications = await Medication.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(medications);
});

router.put('/:id', auth, async (req, res) => {
  try {
    const medication = await Medication.findById(req.params.id);
    if (!medication || medication.userId !== req.user.id) {
      return res.status(404).json({ error: 'Медикамент не найден' });
    }
    
    const { name, dosage, intakeTimes, frequency, startDate, endDate, notes } = req.body;
    
    // Validation
    if (!name || !dosage?.value || !dosage?.unit || !intakeTimes?.length || !frequency?.count || !frequency?.unit || !startDate) {
      return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
    }
    if (intakeTimes.length > 10) {
      return res.status(400).json({ error: 'Максимум 10 времён приёма в день' });
    }
    if (new Date(startDate) > new Date()) {
      return res.status(400).json({ error: 'Дата начала не может быть в будущем' });
    }
    if (endDate && new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ error: 'Дата окончания не может быть раньше даты начала' });
    }
    const validUnits = (await DosageUnit.find({ userId: req.user.id })).map(u => u.name);
    if (!validUnits.includes(dosage.unit)) {
      return res.status(400).json({ error: 'Недопустимая единица измерения' });
    }

    Object.assign(medication, { name, dosage, intakeTimes, frequency, startDate, endDate, notes });
    await medication.save();
    
    // Regenerate intake records
    await MedicationIntake.deleteMany({ medicationId: medication._id });
    await generateIntakeRecords(medication);
    
    res.json(medication);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id/complete', auth, async (req, res) => {
  try {
    const medication = await Medication.findById(req.params.id);
    if (!medication || medication.userId !== req.user.id) {
      return res.status(404).json({ error: 'Медикамент не найден' });
    }
    medication.isCompleted = true;
    await medication.save();
    
    // Delete all planned intakes for this medication
    await MedicationIntake.deleteMany({
      medicationId: medication._id,
      status: 'planned',
    });
    
    res.json({ message: 'Медикамент завершён' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id/restore', auth, async (req, res) => {
  try {
    const medication = await Medication.findById(req.params.id);
    if (!medication || medication.userId !== req.user.id) {
      return res.status(404).json({ error: 'Медикамент не найден' });
    }
    medication.isCompleted = false;
    await medication.save();
    await generateIntakeRecords(medication);
    res.json({ message: 'Медикамент восстановлен' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const medication = await Medication.findById(req.params.id);
    if (!medication || medication.userId !== req.user.id || !medication.isCompleted) {
      return res.status(400).json({ error: 'Медикамент не найден или не завершён' });
    }
    await MedicationIntake.deleteMany({ medicationId: medication._id });
    await medication.deleteOne();
    res.json({ message: 'Медикамент удалён' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Intake Management
router.get('/intakes', auth, async (req, res) => {
  try {
    const { startDate, endDate, medicationId } = req.query;
    let query = { userId: req.user.id };
    if (medicationId) query.medicationId = medicationId;
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const intakes = await MedicationIntake.find(query).populate({
      path: 'medicationId',
      select: 'name dosage',
    });
    res.json(intakes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/intakes/:id', auth, async (req, res) => {
  try {
    const intake = await MedicationIntake.findById(req.params.id).populate({
      path: 'medicationId',
      select: 'name dosage',
    });
    if (!intake || intake.userId !== req.user.id) {
      return res.status(404).json({ error: 'Запись приёма не найдена' });
    }
    const { status } = req.body;
    if (!['taken', 'missed', 'planned'].includes(status)) {
      return res.status(400).json({ error: 'Недопустимый статус' });
    }
    // Restrict setting 'planned' for past intakes (before today)
    if (status === 'planned' && !isSameDay(new Date(intake.date), new Date()) && isBefore(new Date(intake.date), new Date())) {
      return res.status(400).json({ error: 'Нельзя установить статус "запланировано" для прошедших приёмов' });
    }
    intake.status = status;
    await intake.save();
    res.json(intake);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Dosage Units CRUD
router.post('/dosage-units', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Название единицы обязательно' });
    const existingUnit = await DosageUnit.findOne({ userId: req.user.id, name });
    if (existingUnit) return res.status(400).json({ error: 'Единица уже существует' });
    const unit = new DosageUnit({ userId: req.user.id, name });
    await unit.save();
    res.status(201).json(unit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/dosage-units', auth, async (req, res) => {
  const defaultUnits = ['мг', 'мл', 'таблетки', 'капли', 'ампулы'];
  for (const unitName of defaultUnits) {
    const existingUnit = await DosageUnit.findOne({ userId: req.user.id, name: unitName });
    if (!existingUnit) {
      const newUnit = new DosageUnit({ userId: req.user.id, name: unitName });
      await newUnit.save();
    }
  }
  const units = await DosageUnit.find({ userId: req.user.id });
  res.json(units);
});

router.put('/dosage-units/:id', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Название единицы обязательно' });
    const unit = await DosageUnit.findById(req.params.id);
    if (!unit || unit.userId !== req.user.id) {
      return res.status(404).json({ error: 'Единица не найдена' });
    }
    const existingUnit = await DosageUnit.findOne({ userId: req.user.id, name, _id: { $ne: req.params.id } });
    if (existingUnit) return res.status(400).json({ error: 'Единица с таким названием уже существует' });
    unit.name = name;
    await unit.save();
    await Medication.updateMany(
      { userId: req.user.id, 'dosage.unit': unit.name },
      { $set: { 'dosage.unit': name } }
    );
    res.json(unit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/dosage-units/:id', auth, async (req, res) => {
  try {
    const unit = await DosageUnit.findById(req.params.id);
    if (!unit || unit.userId !== req.user.id) {
      return res.status(404).json({ error: 'Единица не найдена' });
    }
    const medicationsUsingUnit = await Medication.findOne({ userId: req.user.id, 'dosage.unit': unit.name });
    if (medicationsUsingUnit) {
      return res.status(400).json({ error: 'Нельзя удалить единицу, используемую в медикаментах' });
    }
    await unit.deleteOne();
    res.json({ message: 'Единица удалена' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Helper function to generate intake records
async function generateIntakeRecords(medication) {
  const { startDate, endDate, intakeTimes, frequency } = medication;
  let currentDate = new Date(startDate);
  const end = endDate ? new Date(endDate) : addMonths(currentDate, 1);
  
  while (isBefore(currentDate, end) || currentDate.toDateString() === end.toDateString()) {
    for (const time of intakeTimes) {
      const intake = new MedicationIntake({
        userId: medication.userId,
        medicationId: medication._id,
        date: currentDate,
        time,
        status: 'planned',
      });
      await intake.save();
    }
    
    // Advance date based on frequency
    if (frequency.unit === 'день') {
      currentDate = addDays(currentDate, frequency.count);
    } else if (frequency.unit === 'неделя') {
      currentDate = addWeeks(currentDate, frequency.count);
    } else if (frequency.unit === 'месяц') {
      currentDate = addMonths(currentDate, frequency.count);
    }
  }
}

module.exports = router;