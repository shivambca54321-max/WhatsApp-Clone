import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  user: mongoose.Types.ObjectId;
  refreshToken: string;
  deviceType?: string;
  ipAddress?: string;
  lastActive: Date;
  expiresAt: Date;
}

const SessionSchema: Schema<ISession> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
      index: true,
    },
    deviceType: {
      type: String,
      default: 'Unknown',
    },
    ipAddress: {
      type: String,
      default: '',
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Automatically delete when expired
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISession>('Session', SessionSchema);
