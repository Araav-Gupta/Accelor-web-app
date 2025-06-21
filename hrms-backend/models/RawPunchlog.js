import mongoose from 'mongoose';

const rawPunchlogSchema = new mongoose.Schema({
  UserID: {
    type: String,
    required: true,
  },
  LogDate: {
    type: Date,
    required: true,
  },
  LogTime: {
    type: String, // Format: HH:MM:SS
    required: true,
  },
  Direction: {
    type: String,
    enum: ['in', 'out'],
    default: 'out',
  },
  processed: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// ✅ Unique compound index to prevent duplicate punch logs
rawPunchlogSchema.index({ UserID: 1, LogDate: 1, LogTime: 1 }, { unique: true });

export default mongoose.model('RawPunchlog', rawPunchlogSchema);
