const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Simple test route
app.get('/', (req, res) => {
  res.send('AI Writing Companion API is running');
});

// Connect to MongoDB (will configure later)
// mongoose.connect(process.env.MONGO_URI)
//  .then(() => console.log('Connected to MongoDB'))
//  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
