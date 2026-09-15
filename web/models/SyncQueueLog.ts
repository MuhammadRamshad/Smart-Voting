import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISyncQueueLog {
  clientRequestId: string;   // idempotency key (uuid)
  deviceId: string;          // hashed device fingerprint
  electionId: string;
  status: "pending" | "synced" | "failed" | "dead_letter";
  attempts: number;
  lastAttemptAt?: Date;
  syncedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISyncQueueLogDocument extends ISyncQueueLog, Document {}

const SyncQueueLogSchema = new Schema<ISyncQueueLogDocument>(
  {
    clientRequestId: { type: String, required: true, unique: true },
    deviceId: { type: String, required: true },
    electionId: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "synced", "failed", "dead_letter"],
      default: "pending",
    },
    attempts: { type: Number, default: 0 },
    lastAttemptAt: { type: Date },
    syncedAt: { type: Date },
    errorMessage: { type: String },
  },
  {
    timestamps: true,
  }
);

SyncQueueLogSchema.index({ electionId: 1, status: 1 });

export const SyncQueueLog: Model<ISyncQueueLogDocument> =
  mongoose.models.SyncQueueLog ||
  mongoose.model<ISyncQueueLogDocument>("SyncQueueLog", SyncQueueLogSchema);
