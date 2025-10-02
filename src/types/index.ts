// Database types for Dalmore Reserve Management System

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'Editor' | 'Admin';
  created_at: string;
  updated_at: string;
}

export interface Track {
  id: string;
  user_id: string;
  name: string;
  coordinates: Array<{lat: number; lng: number}>;
  color: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface WeedPatch {
  id: string;
  user_id: string;
  center_lat: number;
  center_lng: number;
  diameter: number;
  status: 'NEEDS_WEEDING' | 'HAS_BEEN_WEEDED';
  species: string;
  color: string;
  photo_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Photo {
  id: string;
  user_id: string;
  track_id?: string;
  weed_patch_id?: string;
  cloudinary_url: string;
  thumbnail_url?: string;
  lat: number;
  lng: number;
  created_at: string;
  profile?: Profile;
}

// UI types
export interface GPSPosition {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface LocationState {
  position: GPSPosition | null;
  accuracy: number | null;
  isTracking: boolean;
  error: string | null;
}

// Dalmore Reserve specific bounds
export const DALMORE_BOUNDS = {
  center: [-45.84790936226696, 170.51582555721825] as [number, number],
  northWest: [-45.847403070036805, 170.51320000509955] as [number, number],
  northEast: [-45.847445986405525, 170.5209751820489] as [number, number],
  southWest: [-45.852826543870805, 170.5130252634806] as [number, number],
  southEast: [-45.852677117938406, 170.52151198134527] as [number, number]
};

export const MAP_CONFIG = {
  center: DALMORE_BOUNDS.center,
  zoom: 17,
  minZoom: 16,
  maxZoom: 20,
  maxBounds: [
    DALMORE_BOUNDS.southWest,
    DALMORE_BOUNDS.northEast
  ] as [[number, number], [number, number]]
};

// Touch target minimum size for mobile
export const TOUCH_TARGET_SIZE = 44;

// Weed status colors
export const WEED_COLORS = {
  NEEDS_WEEDING: '#3B82F6', // Blue
  HAS_BEEN_WEEDED: '#F97316' // Orange
};

// Common weed species with assigned colors
export const WEED_SPECIES = [
  'Unknown',
  'Gorse',
  'Broom',
  'Blackberry',
  'Willow',
  'Pine seedlings',
  'Ivy',
  'Buddleja',
  'Old mans beard',
  'Pampas grass',
] as const;

export type WeedSpecies = typeof WEED_SPECIES[number];

// Generate consistent colors for species based on species name
export const getSpeciesColor = (species: string): string => {
  // Special case for Unknown - use default blue
  if (species === 'Unknown') return '#3B82F6';
  
  // Simple hash function to generate consistent colors
  let hash = 0;
  for (let i = 0; i < species.length; i++) {
    hash = species.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert hash to HSL color with good saturation and lightness
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 45%)`;
};
