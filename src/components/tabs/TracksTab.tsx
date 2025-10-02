import React, { useState, useEffect } from 'react';
import { Plus, Play, Square, Save, MapPin } from 'lucide-react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useOfflineStorage } from '../../hooks/useOfflineStorage';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Track, GPSPosition } from '../../types';

export const TracksTab: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<{
    name: string;
    coordinates: GPSPosition[];
    color: string;
  } | null>(null);
  const [trackName, setTrackName] = useState('');
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);

  const { getCurrentPosition, position } = useGeolocation({ watch: isRecording });
  const { saveOfflineTrack } = useOfflineStorage();
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
    loadTracks();
  }, []);

  // Record waypoints when tracking
  useEffect(() => {
    if (isRecording && position && currentTrack) {
      setCurrentTrack(prev => prev ? {
        ...prev,
        coordinates: [...prev.coordinates, position]
      } : null);
    }
  }, [position, isRecording]);

  const loadTracks = async () => {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          profile:profiles(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTracks(data || []);
    } catch (error) {
      console.error('Error loading tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = () => {
    if (!trackName.trim()) {
      alert('Please enter a track name');
      return;
    }

    setCurrentTrack({
      name: trackName.trim(),
      coordinates: [],
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    });
    setIsRecording(true);
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  const addWaypoint = async () => {
    const position = await getCurrentPosition();
    if (!position) {
      alert('Could not get current location');
      return;
    }

    if (!currentTrack) {
      // Create new single-point track
      if (!trackName.trim()) {
        alert('Please enter a track name');
        return;
      }

      setCurrentTrack({
        name: trackName.trim(),
        coordinates: [position],
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`
      });
    } else {
      // Add to existing track
      setCurrentTrack(prev => prev ? {
        ...prev,
        coordinates: [...prev.coordinates, position]
      } : null);
    }
  };

  const saveTrack = async () => {
    if (!currentTrack || currentTrack.coordinates.length === 0 || !user) {
      alert('No track data to save');
      return;
    }

    try {
      if (online) {
        // Online: Save immediately
        const { error } = await supabase
          .from('tracks')
          .insert({
            user_id: user.id,
            name: currentTrack.name,
            coordinates: currentTrack.coordinates,
            color: currentTrack.color
          });

        if (error) throw error;

        alert('Track saved successfully!');
        loadTracks();
      } else {
        // Offline: Save to local storage
        const offlineTrack = {
          id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: currentTrack.name,
          coordinates: currentTrack.coordinates,
          color: currentTrack.color,
          timestamp: new Date().toISOString()
        };
        
        saveOfflineTrack(offlineTrack);
        alert('You\'re offline. Track saved locally and will be uploaded when connection is restored.');
      }

      setCurrentTrack(null);
      setTrackName('');
      setIsRecording(false);
    } catch (error) {
      console.error('Error saving track:', error);
      if (online) {
        alert('Failed to save track');
      } else {
        alert('Error saving track offline');
      }
    }
  };

  const cancelTrack = () => {
    setCurrentTrack(null);
    setTrackName('');
    setIsRecording(false);
  };

  if (loading) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading tracks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Track Management</h2>

        {/* Track Creation Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="mb-3">
            <label htmlFor="trackName" className="block text-sm font-medium text-gray-700 mb-1">
              Track Name
            </label>
            <input
              id="trackName"
              type="text"
              value={trackName}
              onChange={(e) => setTrackName(e.target.value)}
              placeholder="Enter track name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              style={{ fontSize: '16px' }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {!isRecording && !currentTrack ? (
              <>
                <button
                  onClick={startRecording}
                  disabled={!trackName.trim()}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ minHeight: '44px' }}
                >
                  <Play className="h-4 w-4" />
                  Start Recording
                </button>
                <button
                  onClick={addWaypoint}
                  disabled={!trackName.trim()}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ minHeight: '44px' }}
                >
                  <MapPin className="h-4 w-4" />
                  Add Waypoint
                </button>
              </>
            ) : (
              <>
                {isRecording && (
                  <button
                    onClick={stopRecording}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 flex items-center justify-center gap-2"
                    style={{ minHeight: '44px' }}
                  >
                    <Square className="h-4 w-4" />
                    Stop Recording
                  </button>
                )}
                <button
                  onClick={addWaypoint}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                  style={{ minHeight: '44px' }}
                >
                  <Plus className="h-4 w-4" />
                  Add Point
                </button>
                <button
                  onClick={saveTrack}
                  disabled={!currentTrack || currentTrack.coordinates.length === 0}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ minHeight: '44px' }}
                >
                  <Save className="h-4 w-4" />
                  Save Track
                </button>
                <button
                  onClick={cancelTrack}
                  className="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                >
                  ✕
                </button>
              </>
            )}
          </div>

          {/* Current Track Status */}
          {currentTrack && (
            <div className="mt-3 p-3 bg-blue-50 rounded-md">
              <h4 className="font-medium text-blue-900">{currentTrack.name}</h4>
              <p className="text-sm text-blue-700">
                Points: {currentTrack.coordinates.length}
                {isRecording && <span className="ml-2 inline-flex items-center">
                  <span className="animate-pulse h-2 w-2 bg-red-500 rounded-full mr-1"></span>
                  Recording
                </span>}
              </p>
            </div>
          )}
        </div>

        {/* Existing Tracks List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Saved Tracks ({tracks.length})</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {tracks.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No tracks created yet
              </div>
            ) : (
              tracks.map((track) => (
                <div key={track.id} className="p-4 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{track.name}</h4>
                      <p className="text-sm text-gray-600">
                        By: {track.profile?.full_name} • {track.coordinates.length} points
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(track.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div 
                      className="w-4 h-4 rounded border border-gray-300" 
                      style={{ backgroundColor: track.color }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};