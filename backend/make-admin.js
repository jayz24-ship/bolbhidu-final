// Script to make a user admin
import mongoose from 'mongoose';
import { User } from './dist/models/User.js';
import { env } from './dist/config/env.js';

async function makeAdmin() {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get email from command line argument
    const email = process.argv[2];
    
    if (!email) {
      console.error('Usage: node make-admin.js <email>');
      process.exit(1);
    }

    const user = await User.findOneAndUpdate(
      { email },
      { role: 'admin' },
      { new: true }
    );

    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`✅ User ${user.name} (${user.email}) is now an admin!`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

makeAdmin();
