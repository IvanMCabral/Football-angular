// Models for the match comparison endpoint.

import { MatchDetail } from './match-detail.model';

/**
 * Per-bucket event-count diff between baseline and live. A "bucket" is a
 * 5-minute window (bucket 0 = minutes 0-5, ..., bucket 17 = minutes 85-90).
 *
 * `delta = liveCount - baselineCount`. Positive means the live had more
 * of that event in that bucket (i.e. the manager's subs contributed).
 * Player-agnostic: we don't try to match events by playerId because the
 * engine consumes different draws in each run.
 */
export interface EventBucketDiff {
  bucket: number;        // 0-17
  type: string;          // 'GOAL' | 'SHOT' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION'
  baselineCount: number;
  liveCount: number;
  delta: number;
}

/**
 * Scalar deltas + bucket-based timeline diff. All deltas are signed
 * (live - baseline).
 */
export interface MatchComparisonDiff {
  scoreDeltaHome: number;
  scoreDeltaAway: number;
  xgDeltaHome: number;
  xgDeltaAway: number;
  shotsDeltaHome: number;
  shotsDeltaAway: number;
  possessionDeltaHome: number;
  timelineDiff: EventBucketDiff[];   // 90 entries: 5 types x 18 buckets
}

/**
 * Top-level response from GET /careers/{careerId}/matches/{matchId}/compare.
 * - `baseline` is the match replayed with the same initial context + subs[]
 *   applied (what would have happened with the manager's interventions).
 * - `live` is what actually happened (the V24 detail persisted on match finish).
 * - `diff` is signed `live - baseline` for every metric.
 */
export interface MatchComparison {
  baseline: MatchDetail;
  live: MatchDetail;
  diff: MatchComparisonDiff;
}
