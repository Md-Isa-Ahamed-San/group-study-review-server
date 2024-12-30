const mongoose = require('mongoose');
require('dotenv').config();

// Replace with your MongoDB username and password
const username = 'groupStudyReview';
const password = encodeURIComponent('K5gUS5SbAvOpgGYn'); // Use encodeURIComponent for safety
const dbName = 'groupStudyReview';

const MONGO_URI = `mongodb+srv://${process.env.VITE_DB_USERNAME}:${process.env.VITE_DB_PASSWORD}@cluster0.jeu0kz0.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=Cluster0`;

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1); // Exit process if connection fails
  }
};

module.exports = connectDB;
