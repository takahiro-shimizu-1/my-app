export type AnnouncementStatus = "upcoming" | "ongoing" | "awaiting_result" | "closed";

export type BidType =
  | "general-competitive-bidding"
  | "design-competition"
  | "one-off"
  | "proposal"
  | "negotiated-contract"
  | "unknown";

// -- Concrete response types --

export interface AnnouncementListItem {
  id: string;
  announcementNo: number;
  title: string;
  organization: string;
  category: string;
  bidType: string;
  workLocation: string;
  publishDate: string;
  deadline: string;
}

export interface Department {
  postalCode: string;
  address: string;
  name: string;
  contactPerson: string;
  phone: string;
  fax: string;
  email: string;
}

export interface DocumentMeta {
  id: string;
  type: string;
  title: string;
  fileFormat: string;
  pageCount: number | null;
  extractedAt: string | null;
  url: string;
  markdown_path?: string;
  content?: string;
}
