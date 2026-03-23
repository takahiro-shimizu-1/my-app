/**
 * Announcement data module.
 *
 * Announcement list/detail data is fetched via the API layer
 * (data/api/announcementApi.ts). This module provides an empty
 * in-memory collection and legacy helper functions for backwards
 * compatibility.
 *
 * New code should use fetchAnnouncements / fetchAnnouncementDetail
 * from data/api/ instead.
 */
import type { AnnouncementWithStatus } from '../types';

/** Empty collection -- announcements are fetched per-page via the API. */
export const announcements: AnnouncementWithStatus[] = [];

/** @deprecated Use fetchAnnouncementDetail from data/api instead. */
export const findAnnouncementById = (id: string): AnnouncementWithStatus | undefined =>
  announcements.find(a => a.id === id);

/** @deprecated Use the API layer with ordererId filter instead. */
export const getAnnouncementsByOrdererId = (ordererId: string): AnnouncementWithStatus[] =>
  announcements.filter(a => a.ordererId === ordererId);
