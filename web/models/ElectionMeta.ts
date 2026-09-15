import mongoose, { Document, Model, Schema } from "mongoose";

export interface IElectionMeta {
  electionId: string;   // bytes32 hex matching on-chain ID
  title: string;
  candidates: Array<{ id: number; name: string }>;
  status: "Scheduled" | "Open" | "Closed" | "Audited";
  startTime: Date;
  endTime: Date;
  syncedFromChainAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IElectionMetaDocument extends IElectionMeta, Document {}

const ElectionMetaSchema = new Schema<IElectionMetaDocument>(
  {
    electionId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    candidates: [
      {
        id: { type: Number, required: true },
        name: { type: String, required: true },
      },
    ],
    status: {
      type: String,
      enum: ["Scheduled", "Open", "Closed", "Audited"],
      default: "Scheduled",
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    syncedFromChainAt: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

export const ElectionMeta: Model<IElectionMetaDocument> =
  mongoose.models.ElectionMeta ||
  mongoose.model<IElectionMetaDocument>("ElectionMeta", ElectionMetaSchema);
