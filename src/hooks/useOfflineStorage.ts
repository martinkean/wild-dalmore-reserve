import { useState, useEffect } from 'react';

export interface OfflinePhoto {
  id: string;
  file: File;
  lat: number;
  lng: number;
  timestamp: string;
}

export interface OfflineTrack {
  id: string;
  name: string;
  coordinates: Array<{ lat: number; lng: number }>;
  color: string;
  timestamp: string;
}

export interface OfflineWeedPatch {
  id: string;
  center_lat: number;
  center_lng: number;
  diameter: number;
  species: string;
  status: 'NEEDS_WEEDING' | 'HAS_BEEN_WEEDED';
  notes?: string;
  timestamp: string;
}

const STORAGE_KEYS = {
  PHOTOS: 'offline_photos',
  TRACKS: 'offline_tracks',
  WEED_PATCHES: 'offline_weed_patches',
};

export const useOfflineStorage = () => {
  const [offlinePhotos, setOfflinePhotos] = useState<OfflinePhoto[]>([]);
  const [offlineTracks, setOfflineTracks] = useState<OfflineTrack[]>([]);
  const [offlineWeedPatches, setOfflineWeedPatches] = useState<OfflineWeedPatch[]>([]);

  // Load offline data from localStorage on mount
  useEffect(() => {
    loadOfflineData();
  }, []);

  const loadOfflineData = () => {
    try {
      const photos = JSON.parse(localStorage.getItem(STORAGE_KEYS.PHOTOS) || '[]');
      const tracks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRACKS) || '[]');
      const weedPatches = JSON.parse(localStorage.getItem(STORAGE_KEYS.WEED_PATCHES) || '[]');
      
      setOfflinePhotos(photos);
      setOfflineTracks(tracks);
      setOfflineWeedPatches(weedPatches);
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  };

  const saveOfflinePhoto = (photo: OfflinePhoto) => {
    const updatedPhotos = [...offlinePhotos, photo];
    setOfflinePhotos(updatedPhotos);
    localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(updatedPhotos));
  };

  const saveOfflineTrack = (track: OfflineTrack) => {
    const updatedTracks = [...offlineTracks, track];
    setOfflineTracks(updatedTracks);
    localStorage.setItem(STORAGE_KEYS.TRACKS, JSON.stringify(updatedTracks));
  };

  const saveOfflineWeedPatch = (weedPatch: OfflineWeedPatch) => {
    const updatedPatches = [...offlineWeedPatches, weedPatch];
    setOfflineWeedPatches(updatedPatches);
    localStorage.setItem(STORAGE_KEYS.WEED_PATCHES, JSON.stringify(updatedPatches));
  };

  const removeOfflinePhoto = (id: string) => {
    const updatedPhotos = offlinePhotos.filter(photo => photo.id !== id);
    setOfflinePhotos(updatedPhotos);
    localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(updatedPhotos));
  };

  const removeOfflineTrack = (id: string) => {
    const updatedTracks = offlineTracks.filter(track => track.id !== id);
    setOfflineTracks(updatedTracks);
    localStorage.setItem(STORAGE_KEYS.TRACKS, JSON.stringify(updatedTracks));
  };

  const removeOfflineWeedPatch = (id: string) => {
    const updatedPatches = offlineWeedPatches.filter(patch => patch.id !== id);
    setOfflineWeedPatches(updatedPatches);
    localStorage.setItem(STORAGE_KEYS.WEED_PATCHES, JSON.stringify(updatedPatches));
  };

  const clearAllOfflineData = () => {
    setOfflinePhotos([]);
    setOfflineTracks([]);
    setOfflineWeedPatches([]);
    localStorage.removeItem(STORAGE_KEYS.PHOTOS);
    localStorage.removeItem(STORAGE_KEYS.TRACKS);
    localStorage.removeItem(STORAGE_KEYS.WEED_PATCHES);
  };

  const hasOfflineData = () => {
    return offlinePhotos.length > 0 || offlineTracks.length > 0 || offlineWeedPatches.length > 0;
  };

  return {
    // Data
    offlinePhotos,
    offlineTracks,
    offlineWeedPatches,
    
    // Actions
    saveOfflinePhoto,
    saveOfflineTrack,
    saveOfflineWeedPatch,
    removeOfflinePhoto,
    removeOfflineTrack,
    removeOfflineWeedPatch,
    clearAllOfflineData,
    hasOfflineData,
    
    // Utility
    loadOfflineData,
  };
};