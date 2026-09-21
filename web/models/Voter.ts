import mongoose, { Document, Model, Schema } from "mongoose";

export interface IVoter {
  voterHashId: string;       // hash of voter identity
  electionId: string;
  name?: string;
  uidHash?: string;          // keccak256 hash of the NFC card UID
  mfaStatus: {
    otpVerified: boolean;
    nfcVerified?: boolean;
    faceVerified: boolean;
    completedAt?: Date;
  };
  deviceFingerprints: string[];
  faceDescriptor?: number[];    // 128-dim descriptor
  hasVoted: boolean;
  failedFaceAttempts?: number;
  blockedUntil?: Date;
  registeredAt?: Date;
  registeredBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVoterDocument extends IVoter, Document {}

const VoterSchema = new Schema<IVoterDocument>(
  {
    voterHashId: { type: String, required: true },
    electionId: { type: String, required: true },
    name: { type: String, default: "Registered Voter" },
    uidHash: { type: String, default: undefined },
    mfaStatus: {
      otpVerified: { type: Boolean, default: false },
      nfcVerified: { type: Boolean, default: false },
      faceVerified: { type: Boolean, default: false },
      completedAt: { type: Date },
    },
    deviceFingerprints: { type: [String], default: [] },
    faceDescriptor: { type: [Number], default: undefined },
    hasVoted: { type: Boolean, default: false },
    failedFaceAttempts: { type: Number, default: 0 },
    blockedUntil: { type: Date, default: undefined },
    registeredAt: { type: Date, default: Date.now },
    registeredBy: { type: String, default: "Officer" },
  },
  {
    timestamps: true,
  }
);

VoterSchema.index({ voterHashId: 1, electionId: 1 }, { unique: true });
VoterSchema.index({ uidHash: 1, electionId: 1 });

export const Voter: Model<IVoterDocument> =
  mongoose.models.Voter ||
  mongoose.model<IVoterDocument>("Voter", VoterSchema);
