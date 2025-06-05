//models/Folder.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FolderSchema = new Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true, maxlength: 50 },
  parentId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null }, // Reference to parent folder
});

// Unique index for userId, name, and parentId to prevent duplicate folder names in the same parent
FolderSchema.index({ userId: 1, name: 1, parentId: 1 }, { unique: true });

module.exports = mongoose.model('Folder', FolderSchema);