// models/SyncMetadata.js

import mongoose from 'mongoose';

const syncMetadataSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  lastSyncedAt: { type: Date, required: true },
});

export default mongoose.model('SyncMetadata', syncMetadataSchema);
