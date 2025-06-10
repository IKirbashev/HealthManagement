// app.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth');
const healthRecordRoutes = require('./routes/healthRecords');
const medicationRoutes = require('./routes/medications');
const biomarkerRoutes = require('./routes/biomarkers');
const documentRoutes = require('./routes/documents');
const ocrRoutes = require('./routes/ocr');

const app = express();

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/health-records', healthRecordRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/biomarkers', biomarkerRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/ocr', ocrRoutes);

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));