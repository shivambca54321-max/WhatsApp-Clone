import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  password?: string;
  profilePhoto: string;
  coverPhoto?: string;
  bio?: string;
  about: string;
  status: 'online' | 'offline' | 'away' | 'dnd';
  lastSeen: Date;
  isVerified: boolean;
  verificationOTP?: string;
  verificationOTPExpires?: Date;
  resetPasswordOTP?: string;
  resetPasswordOTPExpires?: Date;
  contacts: mongoose.Types.ObjectId[];
  favorites: mongoose.Types.ObjectId[];
  blockedUsers: mongoose.Types.ObjectId[];
  themePreference: 'light' | 'dark' | 'amoled';
  accentColor: string;
  chatWallpaper?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    profilePhoto: {
      type: String,
      default: '',
    },
    coverPhoto: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      maxlength: [160, 'Bio cannot exceed 160 characters'],
      default: '',
    },
    about: {
      type: String,
      maxlength: [100, 'About status cannot exceed 100 characters'],
      default: 'Hey there! I am using Velo.',
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'away', 'dnd'],
      default: 'offline',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationOTP: String,
    verificationOTPExpires: Date,
    resetPasswordOTP: String,
    resetPasswordOTPExpires: Date,
    contacts: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    favorites: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    blockedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    themePreference: {
      type: String,
      enum: ['light', 'dark', 'amoled'],
      default: 'dark',
    },
    accentColor: {
      type: String,
      default: '#6366F1', // Indigo-500 equivalent
    },
    chatWallpaper: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Hash Password before saving
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    if (this.password) {
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (err: any) {
    next(err);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
