import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  alertType: { type: String, enum: ['warning', 'termination', null], default: null },
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
