import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_development_academic_jwt_secret_key_123456789";

// ─── Voter Token ────────────────────────────────────────────────────────────

export interface VoterTokenPayload {
  voterHashId: string;
  electionId: string;
  otpVerified: boolean;
  faceVerified: boolean;
  iat?: number;
  exp?: number;
}

export function signVoterToken(
  payload: Omit<VoterTokenPayload, "iat" | "exp">
): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
}

export function verifyVoterToken(token: string): VoterTokenPayload {
  return jwt.verify(token, JWT_SECRET) as VoterTokenPayload;
}

// ─── Admin Token ─────────────────────────────────────────────────────────────

export interface AdminTokenPayload {
  adminId: string;
  role: "ELECTION_ADMIN" | "OFFICIAL";
  iat?: number;
  exp?: number;
}

export function signAdminToken(
  payload: Omit<AdminTokenPayload, "iat" | "exp">
): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/**
 * Extracts the raw JWT from an Authorization: Bearer <token> header.
 * Returns null if the header is absent or malformed.
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
