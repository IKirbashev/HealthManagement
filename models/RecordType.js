//models/RecordType.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RecordTypeSchema = new Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true, maxlength: 50 },
  isCustom: { type: Boolean, default: true },
});

// Unique index to prevent duplicate type names for the same user
RecordTypeSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('RecordType', RecordTypeSchema);