import mongoose, { Schema, Document } from 'mongoose';

export interface IReaction {
  user: mongoose.Types.ObjectId;
  emoji: string;
}

export interface IAttachment {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  thumbnailUrl?: string;
}

export interface IPollOption {
  optionId: string;
  text: string;
  votes: mongoose.Types.ObjectId[]; // users who voted for this option
}

export interface IPoll {
  question: string;
  options: IPollOption[];
  multipleAnswers: boolean;
}

export interface ILocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface IContactCard {
  fullName: string;
  phone: string;
  email?: string;
}

export interface IMessageReceipt {
  user: mongoose.Types.ObjectId;
  timestamp: Date;
}

export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  chat: mongoose.Types.ObjectId;
  text?: string;
  messageType: 'text' | 'markdown' | 'image' | 'video' | 'audio' | 'voice' | 'document' | 'location' | 'contact' | 'poll' | 'sticker' | 'gif' | 'system';
  attachment?: IAttachment;
  poll?: IPoll;
  location?: ILocation;
  contactCard?: IContactCard;
  reactions: IReaction[];
  parentMessage?: mongoose.Types.ObjectId; // For replies
  isForwarded: boolean;
  isEdited: boolean;
  isPinned: boolean;
  deliveredTo: IMessageReceipt[];
  readBy: IMessageReceipt[];
  deletedForEveryone: boolean;
  deletedForUsers: mongoose.Types.ObjectId[];
  mentions: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema<IMessage> = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    text: {
      type: String,
      trim: true,
    },
    messageType: {
      type: String,
      enum: [
        'text',
        'markdown',
        'image',
        'video',
        'audio',
        'voice',
        'document',
        'location',
        'contact',
        'poll',
        'sticker',
        'gif',
        'system',
      ],
      default: 'text',
    },
    attachment: {
      url: String,
      fileName: String,
      fileSize: Number,
      mimeType: String,
      thumbnailUrl: String,
    },
    poll: {
      question: String,
      options: [
        {
          optionId: String,
          text: String,
          votes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        },
      ],
      multipleAnswers: { type: Boolean, default: false },
    },
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
    contactCard: {
      fullName: String,
      phone: String,
      email: String,
    },
    reactions: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        emoji: String,
      },
    ],
    parentMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    isForwarded: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    deliveredTo: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    readBy: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    deletedForEveryone: {
      type: Boolean,
      default: false,
    },
    deletedForUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    mentions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IMessage>('Message', MessageSchema);
