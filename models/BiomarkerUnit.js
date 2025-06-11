// models/BiomarkerUnit.js
const mongoose = require('mongoose');
const biomarkerUnitSchema = new mongoose.Schema({
  name: { type: String, required: true, maxLength: 20, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});
module.exports = mongoose.model('BiomarkerUnit', biomarkerUnitSchema);