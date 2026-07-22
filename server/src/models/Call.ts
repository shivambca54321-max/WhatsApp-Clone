import mongoose, { Schema, Document } from 'mongoose';

export interface ICall extends Document {
  caller: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId; // or array if group call
  isGroupCall: boolean;
  chat?: mongoose.Types.ObjectId; // reference to group chat if group call
  callType: 'voice' | 'video';
  status: 'missed' | 'completed' | 'rejected' | 'busy' | 'no-answer';
  duration: number; // in seconds
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
}

const CallSchema: Schema<ICall> = new Schema(
  {
    caller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isGroupCall: {
      type: Boolean,
      default: false,
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
    },
    callType: {
      type: String,
      enum: ['voice', 'video'],
      default: 'voice',
    },
    status: {
      type: String,
      enum: ['missed', 'completed', 'rejected', 'busy', 'no-answer'],
      default: 'completed',
    },
    duration: {
      type: Number,
      default: 0, // duration in seconds
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: Date,
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only log creation/start time
  }
);

export default mongoose.model<ICall>('Call', CallSchema);
