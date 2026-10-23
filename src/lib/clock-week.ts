import 'server-only';
import { createHash } from 'node:crypto';

/** A fingerprint of the workout text, to tell whether it changed after the timers were set. */
export const partsFingerprint = (parts: unknown) => createHash('sha1').update(JSON.stringify(parts ?? [])).digest('hex').slice(0, 16);
