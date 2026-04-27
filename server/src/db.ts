import mongoose from 'mongoose';
import { config } from 'dotenv';

config();

const defaultUri = 'mongodb://127.0.0.1:27017/jano_dialysis';

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI ?? defaultUri;

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(uri);
  return mongoose.connection;
}

export async function disconnectFromDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}