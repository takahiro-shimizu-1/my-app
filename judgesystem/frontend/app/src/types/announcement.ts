/**
 * Announcement-specific type definitions.
 *
 * Re-exported here so that consumers can import from
 * `../types/announcement` for domain-specific types.
 */

/** Lifecycle status of an announcement. */
export type AnnouncementStatus = 'upcoming' | 'ongoing' | 'awaiting_result' | 'closed';

/** Bid type classification. */
export type BidType =
  | 'general-competitive-bidding'
  | 'design-competition'
  | 'one-off'
  | 'proposal'
  | 'negotiated-contract'
  | 'unknown';
