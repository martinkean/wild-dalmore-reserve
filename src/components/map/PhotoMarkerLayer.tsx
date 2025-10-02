import React, { useEffect, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { supabase } from '../../lib/supabase';
import { Photo } from '../../types';
import L from 'leaflet';

// Custom camera icon for photo markers
const cameraIcon = new L.DivIcon({
  className: 'photo-marker',
  html: `
    <div style="
      width: 24px;
      height: 24px;
      background-color: #8B5CF6;
      border: 2px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">
      <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
        <path d="M12 15.2c1.74 0 3.2-1.46 3.2-3.2s-1.46-3.2-3.2-3.2-3.2 1.46-3.2 3.2 1.46 3.2 3.2 3.2z"/>
        <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9z"/>
      </svg>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface PhotoModalProps {
  photo: Photo;
  onClose: () => void;
}

const PhotoModal: React.FC<PhotoModalProps> = ({ photo, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold">Photo Details</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <div className="p-4">
          <img
            src={photo.cloudinary_url}
            alt="Photo"
            className="w-full h-auto rounded-md mb-3"
          />
          <div className="text-sm space-y-1">
            <p><strong>Taken by:</strong> {photo.profile?.full_name}</p>
            <p><strong>Date:</strong> {new Date(photo.created_at).toLocaleString()}</p>
            <p><strong>Location:</strong> {photo.lat.toFixed(6)}, {photo.lng.toFixed(6)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PhotoMarkerLayer: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPhotos();

    // Subscribe to photo changes
    const subscription = supabase
      .channel('photos_channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'photos' },
        () => {
          loadPhotos();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select(`
          *,
          profile:profiles(full_name)
        `);

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  return (
    <>
      {photos.map((photo) => (
        <Marker
          key={photo.id}
          position={[photo.lat, photo.lng]}
          icon={cameraIcon}
        >
          <Popup>
            <div className="p-2">
              <img
                src={photo.thumbnail_url || photo.cloudinary_url}
                alt="Photo thumbnail"
                className="w-32 h-32 object-cover rounded-md mb-2 cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              />
              <p className="text-xs text-gray-600">
                By: {photo.profile?.full_name}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(photo.created_at).toLocaleDateString()}
              </p>
              <button
                onClick={() => setSelectedPhoto(photo)}
                className="text-xs text-blue-600 hover:text-blue-800 mt-1"
              >
                View Full Size
              </button>
            </div>
          </Popup>
        </Marker>
      ))}

      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </>
  );
};