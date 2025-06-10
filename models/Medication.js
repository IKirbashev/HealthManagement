//models/Medication.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MedicationSchema = new Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true, maxlength: 100 },
  dosage: {
    value: { type: Number, required: true, min: 1, max: 9999 },
    unit: { type: String, required: true },
  },
  intakeTimes: [{ type: String, required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ }],
  frequency: {
    count: { type: Number, required: true, min: 1, max: 30 },
    unit: { type: String, required: true, enum: ['день', 'неделя', 'месяц'] },
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  notes: { type: String, maxlength: 500 },
  isCompleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const MedicationIntakeSchema = new Schema({
  userId: { type: String, required: true },
  medicationId: { type: Schema.Types.ObjectId, ref: 'Medication', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
  status: { type: String, enum: ['planned', 'taken', 'missed'], default: 'planned' },
});

const DosageUnitSchema = new Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true, maxlength: 50 },
});

const Medication = mongoose.model('Medication', MedicationSchema);
const MedicationIntake = mongoose.model('MedicationIntake', MedicationIntakeSchema);
const DosageUnit = mongoose.model('DosageUnit', DosageUnitSchema);

module.exports = { Medication, MedicationIntake, DosageUnit };