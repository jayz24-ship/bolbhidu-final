// Simple script to make a user admin (no build needed)
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function makeAdmin() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI not found in .env');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const email = process.argv[2];
    
    if (!email) {
      console.error('Usage: node make-admin-simple.js <email>');
      process.exit(1);
    }

    const result = await mongoose.connection.db.collection('users').findOneAndUpdate(
      { email },
      { $set: { role: 'admin' } },
      { returnDocument: 'after' }
    );

    if (!result) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`✅ User ${result.name} (${result.email}) is now an admin!`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

makeAdmin();
