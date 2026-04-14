const mongoose = require('mongoose');

const DEFAULT_LOCAL_URI = 'mongodb://localhost:27017/complete_backend';

async function connectDB() {
  const uri = process.env.MONGO_URI || DEFAULT_LOCAL_URI;

  try {
    // Mongoose 7+ enables the new URL parser and unified topology by default.
    await mongoose.connect(uri);
    console.log(`Connected to MongoDB (${uri})`);
  } catch (error) {
    console.error(`Error connecting to MongoDB (${uri}):`, error.message || error);
    console.error(
      'Tip: set MONGO_URI in your .env or ensure your local MongoDB is running on localhost:27017'
    );
    process.exit(1);
  }
}

module.exports = connectDB;