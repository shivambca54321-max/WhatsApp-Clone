import mongoose, { Schema, Document } from 'mongoose';

export interface IChat extends Document {
  chatName?: string;
  chatImage?: string;
  chatBanner?: string;
  chatDescription?: string;
  isGroupChat: boolean;
  isChannel: boolean;
  participants: mongoose.Types.ObjectId[];
  admins: mongoose.Types.ObjectId[];
  latestMessage?: mongoose.Types.ObjectId;
  unreadCounts: Map<string, number>;
  pinnedBy: mongoose.Types.ObjectId[];
  mutedBy: mongoose.Types.ObjectId[];
  archivedBy: mongoose.Types.ObjectId[];
  hiddenBy: mongoose.Types.ObjectId[];
  inviteCode?: string;
  isAnnouncementMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema: Schema<IChat> = new Schema(
  {
    chatName: {
      type: String,
      trim: true,
    },
    chatImage: {
      type: String,
      default: '',
    },
    chatBanner: {
      type: String,
      default: '',
    },
    chatDescription: {
      type: String,
      default: '',
    },
    isGroupChat: {
      type: Boolean,
      default: false,
    },
    isChannel: {
      type: Boolean,
      default: false,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    admins: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    latestMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
    pinnedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    mutedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    archivedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    hiddenBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    isAnnouncementMode: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IChat>('Chat', ChatSchema);
