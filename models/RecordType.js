//models/RecordType.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RecordTypeSchema = new Schema({
  userId: { type: String, required: true },
  name: { 
    type: String, 
    required: true, 
    maxlength: 50,
    match: [/^[\p{L}\p{N}\s]+$/u, 'Название типа должно содержать только буквы, цифры и пробелы']
  },
});

module.exports = mongoose.model('RecordType', RecordTypeSchema);