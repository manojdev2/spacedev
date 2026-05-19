// LocatePro Type Definitions

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  lat: number;
  lng: number;
  category: LocationCategory;
  phone: string;
  email: string;
  website?: string;
  openingHours: OpeningHours;
  services: string[];
  isActive: boolean;
  clientId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type LocationCategory = 
  | 'retail'
  | 'warehouse'
  | 'service-center'
  | 'headquarters'
  | 'branch';

export interface OpeningHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  isOpen: boolean;
  open: string;
  close: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clientId: string;
  avatar?: string;
  createdAt: Date;
}

export type UserRole = 'admin' | 'staff';

export interface Client {
  id: string;
  name: string;
  logo?: string;
  plan: SubscriptionPlan;
  maxLocations: number;
  createdAt: Date;
}

export type SubscriptionPlan = 'starter' | 'professional' | 'enterprise';

export interface SearchFilters {
  query: string;
  category: LocationCategory | 'all';
  radius: number;
  city: string;
}

export interface AnalyticsData {
  totalLocations: number;
  activeLocations: number;
  totalSearches: number;
  topLocations: { locationId: string; name: string; views: number }[];
  searchTrends: { term: string; count: number }[];
  activityLog: ActivityLogEntry[];
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  locationId?: string;
  locationName?: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface MapViewport {
  center: { lat: number; lng: number };
  zoom: number;
}
