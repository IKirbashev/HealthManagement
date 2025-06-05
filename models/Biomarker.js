// models/Biomarker.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BiomarkerSchema = new Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true, maxlength: 100 },
  isCustom: { type: Boolean, default: false },
});

const BiomarkerResultSchema = new Schema({
  biomarkerId: { type: Schema.Types.ObjectId, ref: 'Biomarker', required: true },
  userId: { type: String, required: true },
  date: { type: Date, required: true },
  value: { type: Number, required: true, min: 0, max: 999999 },
  unit: { type: String, required: true },
  comments: { type: String, maxlength: 500 },
});

const Biomarker = mongoose.model('Biomarker', BiomarkerSchema);
const BiomarkerResult = mongoose.model('BiomarkerResult', BiomarkerResultSchema);

module.exports = { Biomarker, BiomarkerResult };