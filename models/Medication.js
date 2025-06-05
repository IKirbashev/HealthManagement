// models/Medication.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MedicationSchema = new Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true, maxlength: 100 },
  dosageValue: { type: Number, required: true, min: 0, max: 9999 },
  dosageUnit: { type: String, required: true, enum: ['mg', 'ml', 'tablets', 'drops', 'ampoules'] },
  times: [{ type: String, required: true }], // ЧЧ:ММ
  periodicityValue: { type: Number, required: true, min: 1, max: 30 },
  periodicityUnit: { type: String, required: true, enum: ['day', 'week', 'month'] },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  notes: { type: String, maxlength: 500 },
  isActive: { type: Boolean, default: true },
  archived: { type: Boolean, default: false }, // Added to track archived medications
});

const MedicationIntakeSchema = new Schema({
  medicationId: { type: Schema.Types.ObjectId, ref: 'Medication', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  status: { type: String, enum: ['Planned', 'Confirmed', 'Missed'], default: 'Planned' },
});

const Medication = mongoose.model('Medication', MedicationSchema);
const MedicationIntake = mongoose.model('MedicationIntake', MedicationIntakeSchema);

module.exports = { Medication, MedicationIntake };