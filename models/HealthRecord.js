  // models/HealthRecord.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HealthRecordSchema = new Schema({
  userId: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  type: { type: String, enum: ['Symptoms', 'DoctorVisit', 'Recommendations', 'Event'], required: true },
  description: { type: String, maxlength: 1000 },
  doctorName: { type: String, maxlength: 100 },
  eventName: { type: String, maxlength: 200 },
  files: [{ 
    filePath: String, 
    fileType: String, 
    originalName: String // Added to store original file name
  }],
});

module.exports = mongoose.model('HealthRecord', HealthRecordSchema);