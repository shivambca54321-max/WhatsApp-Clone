import mongoose, { Schema, Document } from 'mongoose';

export interface IStory extends Document {
  user: mongoose.Types.ObjectId;
  storyType: 'text' | 'image' | 'video';
  content: string; // text content or URL
  backgroundColor?: string; // for text stories
  caption?: string; // for image/video stories
  views: mongoose.Types.ObjectId[];
  likes: mongoose.Types.ObjectId[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StorySchema: Schema<IStory> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    storyType: {
      type: String,
      enum: ['text', 'image', 'video'],
      default: 'text',
    },
    content: {
      type: String,
      required: true,
    },
    backgroundColor: {
      type: String,
      default: '#1E1B4B', // Indigo-950
    },
    caption: {
      type: String,
      default: '',
    },
    views: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      index: { expires: 0 }, // automatically delete from MongoDB when this time is reached!
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IStory>('Story', StorySchema);
