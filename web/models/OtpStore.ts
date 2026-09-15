import mongoose, { Document, Model, Schema } from "mongoose";

export interface IOtpStore {
  identifier: string;   // voter ID hash
  otp: string;          // bcrypt-hashed OTP
  electionId: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export interface IOtpStoreDocument extends IOtpStore, Document {}

const OtpStoreSchema = new Schema<IOtpStoreDocument>(
  {
    identifier: { type: String, required: true },
    otp: { type: String, required: true },
    electionId: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// TTL index: MongoDB automatically deletes expired OTP documents
OtpStoreSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for fast lookup by identifier + electionId
OtpStoreSchema.index({ identifier: 1, electionId: 1 });

export const OtpStore: Model<IOtpStoreDocument> =
  mongoose.models.OtpStore ||
  mongoose.model<IOtpStoreDocument>("OtpStore", OtpStoreSchema);
