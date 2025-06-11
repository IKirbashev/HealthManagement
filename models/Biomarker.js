// models/Biomarker.js
const mongoose = require('mongoose');
const biomarkerSchema = new mongoose.Schema({
  name: { type: String, required: true, maxLength: 100 },
  date: { type: Date, required: true },
  value: { type: Number, required: true, min: 0.01, max: 9999.99 },
  unit: { type: String, required: true },
  comments: { type: String, maxLength: 500 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});
module.exports = mongoose.model('Biomarker', biomarkerSchema);