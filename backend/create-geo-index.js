// Script to create geospatial index on Post collection
import mongoose from 'mongoose';
import { Post } from './dist/models/Post.js';
import { env } from './dist/config/env.js';

async function createGeoIndex() {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Drop existing indexes (except _id)
    const indexes = await Post.collection.getIndexes();
    console.log('Existing indexes:', Object.keys(indexes));

    // Create 2dsphere index on location field
    await Post.collection.createIndex({ location: '2dsphere' });
    console.log('✅ Created 2dsphere index on location field');

    // Verify index was created
    const newIndexes = await Post.collection.getIndexes();
    console.log('New indexes:', Object.keys(newIndexes));

    await mongoose.disconnect();
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createGeoIndex();
