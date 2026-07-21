import type { DynamicFilterValues } from "../lib/dynamicFilters";

export interface AuthUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
}

export interface SavedGamePreferences {
  version: 1;
  playerOne: string;
  playerTwo: string;
  playerOneSexSlug: string | null;
  playerTwoSexSlug: string | null;
  modeSlug: string | null;
  levelSlugs: string[];
  deckSlugs: string[];
  elementSlugs: string[];
  toySlugs: string[];
  filters: DynamicFilterValues;
  maxCards: number;
  gameMasterEnabled: boolean;
}

export interface UserProfileRecord {
  id: string | number;
  user: string;
  preferences: SavedGamePreferences | null;
  date_created?: string | null;
  date_updated?: string | null;
}

export type AuthStatus = "initializing" | "anonymous" | "authenticated";

export interface CouplePartner {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export interface CoupleProfile {
  id: string;
  status: "active" | "closed";
  role: "owner" | "partner";
  partner: CouplePartner | null;
  shared_preferences: unknown | null;
  linked_at: string | null;
}

export interface CoupleInvite {
  code: string;
  expires_at: string;
  link: string;
}

export interface CoupleMatch {
  card_id: string;
  kind: "match" | "talk";
  matched_at: string | null;
}

export type CoupleCardResponse =
  | "interested"
  | "maybe"
  | "no"
  | "repeat"
  | "talk"
  | "blocked"
  | "favorite"
  | "later";
