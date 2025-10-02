import React, { useState, useEffect } from 'react';
import { Camera, Image, Upload, X } from 'lucide-react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useCloudinary } from '../../hooks/useCloudinary';
import { useOfflineStorage } from '../../hooks/useOfflineStorage';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Photo } from '../../types';

export const PhotosTab: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);

  const { getCurrentPosition } = useGeolocation();
  const { uploadImage, uploading, error: uploadError } = useCloudinary();
  const { saveOfflinePhoto } = useOfflineStorage();
  const { user } = useAuth();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select(`
          *,
          profile:profiles(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const capturePhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use rear camera on mobile
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handlePhotoUpload(file);
      }
    };
    input.click();
  };

  const handlePhotoUpload = async (file: File) => {
    if (!user) {
      alert('Please sign in to upload photos');
      return;
    }

    const position = await getCurrentPosition();
    if (!position) {
      alert('Could not get current location. Please enable location services.');
      return;
    }

    try {
      if (online) {
        // Online: Upload immediately
        const cloudinaryResponse = await uploadImage(file);
        if (!cloudinaryResponse) {
          throw new Error('Failed to upload image');
        }

        // Create thumbnail URL
        const thumbnailUrl = `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/w_150,h_150,c_fill/${cloudinaryResponse.public_id}`;

        const { error } = await supabase
          .from('photos')
          .insert({
            user_id: user.id,
            cloudinary_url: cloudinaryResponse.secure_url,
            thumbnail_url: thumbnailUrl,
            lat: position.lat,
            lng: position.lng
          });

        if (error) throw error;

        alert('Photo uploaded successfully!');
        loadPhotos();
      } else {
        // Offline: Save to local storage
        const offlinePhoto = {
          id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          lat: position.lat,
          lng: position.lng,
          timestamp: new Date().toISOString()
        };
        
        saveOfflinePhoto(offlinePhoto);
        alert('You\'re offline. Photo saved locally and will be uploaded when connection is restored.');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      if (online) {
        alert('Failed to upload photo');
      } else {
        alert('Error saving photo offline');
      }
    }
  };

  const deletePhoto = async (id: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Photo deleted successfully!');
      setSelectedPhoto(null);
      loadPhotos();
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo');
    }
  };

  if (loading) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Photo Management</h2>

        {/* Capture Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          {uploadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm mb-4">
              {uploadError}
            </div>
          )}

          <button
            onClick={capturePhoto}
            disabled={uploading}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ minHeight: '44px' }}
          >
            {uploading ? (
              <>
                <Upload className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" />
                Take Photo at Current Location
              </>
            )}
          </button>
        </div>

        {/* Photo Grid */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Photos ({photos.length})</h3>
          </div>
          
          {photos.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Image className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No photos captured yet</p>
              <p className="text-sm mt-1">Take your first photo to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square cursor-pointer rounded-lg overflow-hidden bg-gray-100"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={photo.thumbnail_url || photo.cloudinary_url}
                    alt="Field photo"
                    className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
                    <p className="text-xs truncate">
                      {photo.profile?.full_name}
                    </p>
                    <p className="text-xs">
                      {new Date(photo.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold">Photo Details</h3>
              <div className="flex gap-2">
                {user?.id === selectedPhoto.user_id && (
                  <button
                    onClick={() => deletePhoto(selectedPhoto.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-4">
              <img
                src={selectedPhoto.cloudinary_url}
                alt="Field photo"
                className="w-full h-auto rounded-md mb-3"
              />
              <div className="text-sm space-y-1">
                <p><strong>Taken by:</strong> {selectedPhoto.profile?.full_name}</p>
                <p><strong>Date:</strong> {new Date(selectedPhoto.created_at).toLocaleString()}</p>
                <p><strong>Location:</strong> {selectedPhoto.lat.toFixed(6)}, {selectedPhoto.lng.toFixed(6)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};