// models/Document.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DocumentSchema = new Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true, maxlength: 200 },
  filePath: { type: String, required: true },
  fileType: { type: String, required: true },
  folderId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null }, // Reference to folder
  uploadDate: { type: Date, default: Date.now },
  relatedRecordId: { type: Schema.Types.ObjectId, ref: 'HealthRecord' },
  relatedBiomarkerResultId: { type: Schema.Types.ObjectId, ref: 'BiomarkerResult' },
});

module.exports = mongoose.model('Document', DocumentSchema);