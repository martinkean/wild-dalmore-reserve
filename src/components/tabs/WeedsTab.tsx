import React, { useState, useEffect } from 'react';
import { MapPin, Plus, CreditCard as Edit2, Save, X } from 'lucide-react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useOfflineStorage } from '../../hooks/useOfflineStorage';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { WeedPatch, WEED_SPECIES, getSpeciesColor } from '../../types';

export const WeedsTab: React.FC = () => {
  const [weedPatches, setWeedPatches] = useState<WeedPatch[]>([]);
  const [editingPatch, setEditingPatch] = useState<WeedPatch | null>(null);
  const [newPatch, setNewPatch] = useState({
    center_lat: 0,
    center_lng: 0,
    species: 'Unknown',
    diameter: 10,
    status: 'NEEDS_WEEDING' as const,
    notes: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);

  const { getCurrentPosition } = useGeolocation();
  const { saveOfflineWeedPatch } = useOfflineStorage();
  const { user, isAdmin } = useAuth();

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
    loadWeedPatches();
  }, []);

  const loadWeedPatches = async () => {
    try {
      const { data, error } = await supabase
        .from('weed_patches')
        .select(`
          *,
          profile:profiles(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWeedPatches(data || []);
    } catch (error) {
      console.error('Error loading weed patches:', error);
    } finally {
      setLoading(false);
    }
  };

  const captureCurrentLocation = async () => {
    const position = await getCurrentPosition();
    if (!position) {
      alert('Could not get current location. Please enable location services.');
      return;
    }

    setNewPatch(prev => ({
      ...prev,
      center_lat: position.lat,
      center_lng: position.lng
    }));
    setIsCreating(true);
  };

  const createWeedPatch = async () => {
    if (!user || newPatch.center_lat === 0 || newPatch.center_lng === 0) {
      alert('Invalid location data');
      return;
    }

    const speciesColor = getSpeciesColor(newPatch.species);

    try {
      if (online) {
        // Online: Save immediately
        const { error } = await supabase
          .from('weed_patches')
          .insert({
            user_id: user.id,
            center_lat: newPatch.center_lat,
            center_lng: newPatch.center_lng,
            species: newPatch.species,
            diameter: newPatch.diameter,
            status: newPatch.status,
            color: speciesColor,
            notes: newPatch.notes || null
          });

        if (error) throw error;

        alert('Weed patch created successfully!');
        loadWeedPatches();
      } else {
        // Offline: Save to local storage
        const offlineWeedPatch = {
          id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          center_lat: newPatch.center_lat,
          center_lng: newPatch.center_lng,
          diameter: newPatch.diameter,
          species: newPatch.species,
          status: newPatch.status,
          notes: newPatch.notes,
          timestamp: new Date().toISOString()
        };
        
        saveOfflineWeedPatch(offlineWeedPatch);
        alert('You\'re offline. Weed patch saved locally and will be uploaded when connection is restored.');
      }

      setNewPatch({
        center_lat: 0,
        center_lng: 0,
        species: 'Unknown',
        diameter: 10,
        status: 'NEEDS_WEEDING',
        notes: ''
      });
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating weed patch:', error);
      if (online) {
        alert('Failed to create weed patch');
      } else {
        alert('Error saving weed patch offline');
      }
    }
  };

  const updateWeedPatch = async (patch: WeedPatch) => {
    const speciesColor = getSpeciesColor(patch.species || 'Unknown');
    
    try {
      const { error } = await supabase
        .from('weed_patches')
        .update({
          species: patch.species,
          diameter: patch.diameter,
          status: patch.status,
          color: speciesColor,
          notes: patch.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', patch.id);

      if (error) throw error;

      alert('Weed patch updated successfully!');
      setEditingPatch(null);
      loadWeedPatches();
    } catch (error) {
      console.error('Error updating weed patch:', error);
      alert('Failed to update weed patch');
    }
  };

  const deleteWeedPatch = async (id: string) => {
    if (!confirm('Are you sure you want to delete this weed patch?')) return;

    try {
      const { error } = await supabase
        .from('weed_patches')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Weed patch deleted successfully!');
      loadWeedPatches();
    } catch (error) {
      console.error('Error deleting weed patch:', error);
      alert('Failed to delete weed patch');
    }
  };

  const canEdit = (patch: WeedPatch) => {
    return isAdmin || patch.user_id === user?.id;
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setNewPatch({
      center_lat: 0,
      center_lng: 0,
      species: 'Unknown',
      diameter: 10,
      status: 'NEEDS_WEEDING',
      notes: ''
    });
  };

  if (loading) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading weed patches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Weed Management</h2>

        {/* Create New Patch */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          {!isCreating ? (
            <button
              onClick={captureCurrentLocation}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
              style={{ minHeight: '44px' }}
            >
              <MapPin className="h-4 w-4" />
              Add Weed Patch at Current Location
            </button>
          ) : (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">New Weed Patch</h3>
              
              <div className="text-sm text-gray-600">
                Location: {newPatch.center_lat.toFixed(6)}, {newPatch.center_lng.toFixed(6)}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weed Species
                </label>
                <select
                  value={newPatch.species}
                  onChange={(e) => setNewPatch(prev => ({ ...prev, species: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  style={{ fontSize: '16px' }}
                >
                  {WEED_SPECIES.map(species => (
                    <option key={species} value={species}>{species}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Diameter (meters)
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={newPatch.diameter}
                  onChange={(e) => setNewPatch(prev => ({ ...prev, diameter: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600">{newPatch.diameter}m</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="NEEDS_WEEDING"
                      checked={newPatch.status === 'NEEDS_WEEDING'}
                      onChange={(e) => setNewPatch(prev => ({ ...prev, status: e.target.value as any }))}
                    />
                    <span className="px-2 py-1 rounded text-white text-xs bg-blue-600">
                      Needs Weeding
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="HAS_BEEN_WEEDED"
                      checked={newPatch.status === 'HAS_BEEN_WEEDED'}
                      onChange={(e) => setNewPatch(prev => ({ ...prev, status: e.target.value as any }))}
                    />
                    <span className="px-2 py-1 rounded text-white text-xs bg-orange-600">
                      Has Been Weeded
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={newPatch.notes}
                  onChange={(e) => setNewPatch(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add notes about this weed patch..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  rows={3}
                  style={{ fontSize: '16px' }}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={createWeedPatch}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
                  style={{ minHeight: '44px' }}
                >
                  <Save className="h-4 w-4" />
                  Save Patch
                </button>
                <button
                  onClick={cancelCreate}
                  className="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Existing Patches List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Weed Patches ({weedPatches.length})</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {weedPatches.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No weed patches recorded yet
              </div>
            ) : (
              weedPatches.map((patch) => (
                <div key={patch.id} className="p-4 border-b border-gray-100 last:border-b-0">
                  {editingPatch?.id === patch.id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Weed Species
                        </label>
                        <select
                          value={editingPatch.species}
                          onChange={(e) => setEditingPatch(prev => prev ? { ...prev, species: e.target.value } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          style={{ fontSize: '16px' }}
                        >
                          {WEED_SPECIES.map(species => (
                            <option key={species} value={species}>{species}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Diameter: {editingPatch.diameter}m
                        </label>
                        <input
                          type="range"
                          min="5"
                          max="50"
                          value={editingPatch.diameter}
                          onChange={(e) => setEditingPatch(prev => prev ? { ...prev, diameter: parseInt(e.target.value) } : null)}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <div className="flex gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              value="NEEDS_WEEDING"
                              checked={editingPatch.status === 'NEEDS_WEEDING'}
                              onChange={(e) => setEditingPatch(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                            />
                            <span className="px-2 py-1 rounded text-white text-xs bg-blue-600">
                              Needs Weeding
                            </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              value="HAS_BEEN_WEEDED"
                              checked={editingPatch.status === 'HAS_BEEN_WEEDED'}
                              onChange={(e) => setEditingPatch(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                            />
                            <span className="px-2 py-1 rounded text-white text-xs bg-orange-600">
                              Has Been Weeded
                            </span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                          value={editingPatch.notes || ''}
                          onChange={(e) => setEditingPatch(prev => prev ? { ...prev, notes: e.target.value } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          rows={2}
                          style={{ fontSize: '16px' }}
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => updateWeedPatch(editingPatch)}
                          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
                          style={{ minHeight: '44px' }}
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditingPatch(null)}
                          className="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
                          style={{ minHeight: '44px', minWidth: '44px' }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-3 h-3 rounded-full border border-gray-300" 
                            style={{ backgroundColor: getSpeciesColor(patch.species || 'Unknown') }}
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {patch.species || 'Unknown'}
                          </span>
                          <span className={`px-2 py-1 rounded text-white text-xs ${
                            patch.status === 'NEEDS_WEEDING' ? 'bg-blue-600' : 'bg-orange-600'
                          }`}>
                            {patch.status === 'NEEDS_WEEDING' ? 'Needs Weeding' : 'Has Been Weeded'}
                          </span>
                          <span className="text-xs text-gray-600">
                            {patch.diameter}m diameter
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          By: {patch.profile?.full_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(patch.created_at).toLocaleDateString()} • 
                          {patch.center_lat.toFixed(6)}, {patch.center_lng.toFixed(6)}
                        </p>
                        {patch.notes && (
                          <p className="text-sm text-gray-600 mt-1">{patch.notes}</p>
                        )}
                      </div>
                      
                      <div className="flex gap-1 ml-4">
                        {canEdit(patch) && (
                          <button
                            onClick={() => setEditingPatch(patch)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                            style={{ minWidth: '44px', minHeight: '44px' }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => deleteWeedPatch(patch.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                            style={{ minWidth: '44px', minHeight: '44px' }}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};