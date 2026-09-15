import mongoose, { Document, Model, Schema } from "mongoose";

export interface IVoter {
  voterHashId: string;       // bcrypt hash of voter ID
  electionId: string;
  mfaStatus: {
    otpVerified: boolean;
    faceVerified: boolean;
    completedAt?: Date;
  };
  deviceFingerprints: string[]; // hashed device fingerprints
  faceDescriptor?: number[];    // face-api.js 128-dim descriptor, deleted after vote
  hasVoted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVoterDocument extends IVoter, Document {}

const VoterSchema = new Schema<IVoterDocument>(
  {
    voterHashId: { type: String, required: true },
    electionId: { type: String, required: true },
    mfaStatus: {
      otpVerified: { type: Boolean, default: false },
      faceVerified: { type: Boolean, default: false },
      completedAt: { type: Date },
    },
    deviceFingerprints: { type: [String], default: [] },
    faceDescriptor: { type: [Number], default: undefined },
    hasVoted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: one voter registration per election
VoterSchema.index({ voterHashId: 1, electionId: 1 }, { unique: true });

export const Voter: Model<IVoterDocument> =
  mongoose.models.Voter ||
  mongoose.model<IVoterDocument>("Voter", VoterSchema);
