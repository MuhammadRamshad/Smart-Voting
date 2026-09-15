/**
 * In-Memory Database Fallback for Development/Demo
 * Automatically activates if local MongoDB is not running, ensuring the prototype
 * can be demonstrated seamlessly without requiring a local mongod service.
 */

export interface MemOtp {
  identifier: string;
  otp: string;
  electionId: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export interface MemVoter {
  voterHashId: string;
  electionId: string;
  mfaStatus: {
    otpVerified: boolean;
    faceVerified: boolean;
    completedAt?: Date;
  };
  deviceFingerprints: string[];
  faceDescriptor?: number[];
  hasVoted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemFlagged {
  attemptId: string;
  electionId: string;
  voterHashId: string;
  riskScore: number;
  reasonCodes: string[];
  contributingFactors: Array<{ factor: string; weight: number; detail?: string }>;
  confidenceCaveat: string;
  reviewStatus: 'pending' | 'reviewed' | 'cleared' | 'escalated';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNote?: string;
  voteQueued: boolean;
  createdAt: Date;
}

export interface MemSyncLog {
  clientRequestId: string;
  deviceId: string;
  electionId: string;
  status: 'pending' | 'synced' | 'failed';
  attempts: number;
  lastAttemptAt?: Date;
  syncedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
}

export interface MemElection {
  electionId: string;
  title: string;
  candidates: Array<{ id: number; name: string }>;
  status: 'Scheduled' | 'Open' | 'Closed' | 'Audited';
  startTime: Date;
  endTime: Date;
  createdAt: Date;
}

class InMemoryStorage {
  otps: MemOtp[] = [];
  voters: Map<string, MemVoter> = new Map();
  flags: MemFlagged[] = [];
  syncLogs: Map<string, MemSyncLog> = new Map();
  elections: MemElection[] = [
    {
      electionId: '0x3bf3952cfe2b5ae1956147b8f53af6c1e4c8c3122466692b2f15185439baf0d1',
      title: 'General Election 2026',
      candidates: [
        { id: 1, name: 'Aromal' },
        { id: 2, name: 'Irshad' },
        { id: 3, name: 'Manikandan' },
      ],
      status: 'Open',
      startTime: new Date(),
      endTime: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      createdAt: new Date(),
    },
  ];

  // OTP operations
  addOtp(otp: MemOtp) {
    this.otps.push(otp);
  }

  findValidOtp(identifier: string, electionId: string) {
    const now = new Date();
    return this.otps
      .filter((o) => o.identifier === identifier && o.electionId === electionId && !o.used && o.expiresAt > now)
      .slice(-1)[0] || null;
  }

  markOtpUsed(identifier: string, electionId: string) {
    const record = this.findValidOtp(identifier, electionId);
    if (record) record.used = true;
  }

  // Voter operations
  getVoter(voterHashId: string, electionId: string) {
    return this.voters.get(`${voterHashId}:${electionId}`) || null;
  }

  saveVoter(voter: MemVoter) {
    this.voters.set(`${voter.voterHashId}:${voter.electionId}`, voter);
  }

  // Flag operations
  addFlag(flag: MemFlagged) {
    this.flags.unshift(flag);
  }

  getFlags(status?: string, electionId?: string) {
    return this.flags.filter((f) => {
      if (status && status !== 'all' && f.reviewStatus !== status) return false;
      if (electionId && f.electionId !== electionId) return false;
      return true;
    });
  }

  updateFlag(attemptId: string, updates: Partial<MemFlagged>) {
    const f = this.flags.find((x) => x.attemptId === attemptId);
    if (f) Object.assign(f, updates);
    return f || null;
  }

  // Sync log operations
  getSyncLog(clientRequestId: string) {
    return this.syncLogs.get(clientRequestId) || null;
  }

  saveSyncLog(log: MemSyncLog) {
    this.syncLogs.set(log.clientRequestId, log);
  }

  countRecentSyncLogs(since: Date) {
    let count = 0;
    this.syncLogs.forEach((log) => {
      if (log.createdAt >= since) count++;
    });
    return count;
  }
}

declare global {
  var __memDb: InMemoryStorage | undefined;
}

export const memDb: InMemoryStorage = global.__memDb ?? new InMemoryStorage();
if (!global.__memDb) {
  global.__memDb = memDb;
}