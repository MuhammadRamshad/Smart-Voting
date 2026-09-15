import mongoose, { Document, Model, Schema } from "mongoose";

export interface IFlaggedVote {
  attemptId: string;           // uuid — unique identifier for this flag event
  electionId: string;
  voterHashId: string;         // hashed, never plaintext
  riskScore: number;           // 0-1 from AI service
  reasonCodes: string[];
  contributingFactors: Array<{ factor: string; weight: number }>;
  confidenceCaveat: string;
  reviewStatus: "pending" | "reviewed" | "cleared" | "escalated";
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNote?: string;
  // The vote is PRESERVED regardless — this record is annotation only
  voteQueued: boolean;        // true if vote was queued for processing despite flag
  createdAt: Date;
  updatedAt: Date;
}

export interface IFlaggedVoteDocument extends IFlaggedVote, Document {}

const FlaggedVoteSchema = new Schema<IFlaggedVoteDocument>(
  {
    attemptId: { type: String, required: true, unique: true },
    electionId: { type: String, required: true },
    voterHashId: { type: String, required: true },
    riskScore: { type: Number, required: true, min: 0, max: 1 },
    reasonCodes: { type: [String], default: [] },
    contributingFactors: [
      {
        factor: { type: String, required: true },
        weight: { type: Number, required: true },
      },
    ],
    confidenceCaveat: { type: String, default: "" },
    reviewStatus: {
      type: String,
      enum: ["pending", "reviewed", "cleared", "escalated"],
      default: "pending",
    },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    reviewNote: { type: String },
    voteQueued: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

FlaggedVoteSchema.index({ electionId: 1, reviewStatus: 1 });

export const FlaggedVote: Model<IFlaggedVoteDocument> =
  mongoose.models.FlaggedVote ||
  mongoose.model<IFlaggedVoteDocument>("FlaggedVote", FlaggedVoteSchema);
