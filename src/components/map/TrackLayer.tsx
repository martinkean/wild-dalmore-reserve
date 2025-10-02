import React, { useEffect, useState } from 'react';
import { Polyline, Popup } from 'react-leaflet';
import { supabase } from '../../lib/supabase';
import { Track } from '../../types';

export const TrackLayer: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTracks();

    // Subscribe to track changes
    const subscription = supabase
      .channel('tracks_channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tracks' },
        () => {
          loadTracks();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadTracks = async () => {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          profile:profiles(full_name)
        `);

      if (error) throw error;
      setTracks(data || []);
    } catch (error) {
      console.error('Error loading tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  return (
    <>
      {tracks.map((track) => (
        <Polyline
          key={track.id}
          positions={track.coordinates.map(coord => [coord.lat, coord.lng])}
          color={track.color}
          weight={4}
          opacity={0.8}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold text-sm">{track.name}</h3>
              <p className="text-xs text-gray-600 mt-1">
                Created by: {track.profile?.full_name}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(track.created_at).toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-500">
                Points: {track.coordinates.length}
              </p>
            </div>
          </Popup>
        </Polyline>
      ))}
    </>
  );
};