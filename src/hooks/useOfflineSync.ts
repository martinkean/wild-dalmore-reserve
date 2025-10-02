import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCloudinary } from './useCloudinary';
import { useOfflineStorage, OfflinePhoto, OfflineTrack, OfflineWeedPatch } from './useOfflineStorage';
import { supabase } from '../lib/supabase';
import { getSpeciesColor } from '../types';

export const useOfflineSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [online, setOnline] = useState(navigator.onLine);
  
  const { user } = useAuth();
  const { uploadImage } = useCloudinary();
  const {
    offlinePhotos,
    offlineTracks,
    offlineWeedPatches,
    removeOfflinePhoto,
    removeOfflineTrack,
    removeOfflineWeedPatch,
    hasOfflineData
  } = useOfflineStorage();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      // Auto-sync when coming back online
      if (hasOfflineData()) {
        syncOfflineData();
      }
    };
    
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [hasOfflineData]);

  const syncOfflineData = async () => {
    if (!user || isSyncing || !online) return;

    setIsSyncing(true);
    setSyncStatus('Syncing offline data...');

    try {
      // Sync photos
      for (const photo of offlinePhotos) {
        await syncPhoto(photo);
      }

      // Sync tracks
      for (const track of offlineTracks) {
        await syncTrack(track);
      }

      // Sync weed patches
      for (const weedPatch of offlineWeedPatches) {
        await syncWeedPatch(weedPatch);
      }

      setSyncStatus('Sync completed successfully');
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('Sync failed - will retry later');
      setTimeout(() => setSyncStatus(''), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncPhoto = async (photo: OfflinePhoto) => {
    try {
      setSyncStatus(`Uploading photo...`);
      
      // Upload to Cloudinary
      const cloudinaryResponse = await uploadImage(photo.file);
      if (!cloudinaryResponse) {
        throw new Error('Failed to upload photo to Cloudinary');
      }

      // Create thumbnail URL
      const thumbnailUrl = `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/w_150,h_150,c_fill/${cloudinaryResponse.public_id}`;

      // Save to Supabase
      const { error } = await supabase
        .from('photos')
        .insert({
          user_id: user.id,
          cloudinary_url: cloudinaryResponse.secure_url,
          thumbnail_url: thumbnailUrl,
          lat: photo.lat,
          lng: photo.lng
        });

      if (error) throw error;

      // Remove from offline storage
      removeOfflinePhoto(photo.id);
    } catch (error) {
      console.error('Error syncing photo:', error);
      throw error;
    }
  };

  const syncTrack = async (track: OfflineTrack) => {
    try {
      setSyncStatus(`Syncing track: ${track.name}`);
      
      const { error } = await supabase
        .from('tracks')
        .insert({
          user_id: user.id,
          name: track.name,
          coordinates: track.coordinates,
          color: track.color
        });

      if (error) throw error;

      // Remove from offline storage
      removeOfflineTrack(track.id);
    } catch (error) {
      console.error('Error syncing track:', error);
      throw error;
    }
  };

  const syncWeedPatch = async (weedPatch: OfflineWeedPatch) => {
    try {
      setSyncStatus(`Syncing weed patch: ${weedPatch.species}`);
      
      const speciesColor = getSpeciesColor(weedPatch.species);
      
      const { error } = await supabase
        .from('weed_patches')
        .insert({
          user_id: user.id,
          center_lat: weedPatch.center_lat,
          center_lng: weedPatch.center_lng,
          diameter: weedPatch.diameter,
          species: weedPatch.species,
          status: weedPatch.status,
          color: speciesColor,
          notes: weedPatch.notes
        });

      if (error) throw error;

      // Remove from offline storage
      removeOfflineWeedPatch(weedPatch.id);
    } catch (error) {
      console.error('Error syncing weed patch:', error);
      throw error;
    }
  };

  return {
    isSyncing,
    syncStatus,
    online,
    hasOfflineData: hasOfflineData(),
    syncOfflineData,
    pendingCount: offlinePhotos.length + offlineTracks.length + offlineWeedPatches.length
  };
};