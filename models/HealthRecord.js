  // models/HealthRecord.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HealthRecordSchema = new Schema({
  userId: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  type: { type: String, required: true },
  description: { type: String, maxlength: 1000 },
  files: [{ 
    filePath: String, 
    fileType: String, 
    originalName: String
  }],
});

module.exports = mongoose.model('HealthRecord', HealthRecordSchema);