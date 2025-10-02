import React, { useEffect, useState, useMemo } from 'react';
import { Circle, Popup } from 'react-leaflet';
import { supabase } from '../../lib/supabase';
import { WeedPatch, getSpeciesColor } from '../../types';

interface WeedPatchLayerProps {
  visibleSpecies?: Set<string>;
}

export const WeedPatchLayer: React.FC<WeedPatchLayerProps> = ({ 
  visibleSpecies = new Set() 
}) => {
  const [weedPatches, setWeedPatches] = useState<WeedPatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeedPatches();

    // Subscribe to weed patch changes
    const subscription = supabase
      .channel('weed_patches_channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'weed_patches' },
        () => {
          loadWeedPatches();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadWeedPatches = async () => {
    try {
      const { data, error } = await supabase
        .from('weed_patches')
        .select(`
          *,
          profile:profiles(full_name)
        `);

      if (error) throw error;
      setWeedPatches(data || []);
    } catch (error) {
      console.error('Error loading weed patches:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  // Filter patches by visible species (if any species filter is active)
  const filteredPatches = visibleSpecies.size > 0 
    ? weedPatches.filter(patch => visibleSpecies.has(patch.species || 'Unknown'))
    : weedPatches;

  return (
    <>
      {filteredPatches.map((patch) => {
        // Use species color as base color
        const baseColor = getSpeciesColor(patch.species || 'Unknown');
        const opacity = patch.status === 'NEEDS_WEEDING' ? 0.8 : 0.4;
        
        return (
        <Circle
          key={patch.id}
          center={[patch.center_lat, patch.center_lng]}
          radius={patch.diameter / 2}
          color={baseColor}
          fillColor={baseColor}
          fillOpacity={opacity * 0.3}
          opacity={opacity}
          weight={2}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold text-sm mb-1">
                {patch.species || 'Unknown'} Patch
              </h3>
              <p className="text-xs text-gray-600 mb-1">
                Diameter: {patch.diameter}m
              </p>
              <p className="text-xs mt-1">
                <span className={`px-2 py-1 rounded text-white text-xs ${
                  patch.status === 'NEEDS_WEEDING' ? 'bg-blue-600' : 'bg-orange-600'
                }`}>
                  {patch.status === 'NEEDS_WEEDING' ? 'Needs Weeding' : 'Has Been Weeded'}
                </span>
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Created by: {patch.profile?.full_name}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(patch.created_at).toLocaleDateString()}
              </p>
              {patch.notes && (
                <p className="text-xs text-gray-600 mt-1">
                  Notes: {patch.notes}
                </p>
              )}
            </div>
          </Popup>
        </Circle>
        );
      })}
    </>
  );
};