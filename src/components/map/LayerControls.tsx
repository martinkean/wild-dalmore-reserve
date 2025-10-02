import React, { useState, useEffect } from 'react';
import { Layers, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getSpeciesColor } from '../../types';

interface LayerControlsProps {
  visibleSpecies: Set<string>;
  onSpeciesToggle: (species: string) => void;
  onToggleAll: () => void;
}

export const LayerControls: React.FC<LayerControlsProps> = ({
  visibleSpecies,
  onSpeciesToggle,
  onToggleAll,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [availableSpecies, setAvailableSpecies] = useState<Array<{ species: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvailableSpecies();
  }, []);

  const loadAvailableSpecies = async () => {
    try {
      const { data, error } = await supabase
        .from('weed_patches')
        .select('species');

      if (error) throw error;

      // Count patches per species
      const speciesCount: Record<string, number> = {};
      data.forEach(patch => {
        const species = patch.species || 'Unknown';
        speciesCount[species] = (speciesCount[species] || 0) + 1;
      });

      const speciesList = Object.entries(speciesCount)
        .map(([species, count]) => ({ species, count }))
        .sort((a, b) => a.species.localeCompare(b.species));

      setAvailableSpecies(speciesList);
    } catch (error) {
      console.error('Error loading species:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || availableSpecies.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white hover:bg-gray-50 p-2 rounded-md shadow-md border border-gray-300 flex items-center gap-2"
        style={{ minWidth: '44px', minHeight: '44px' }}
      >
        <Layers className="h-5 w-5 text-gray-700" />
        {!isOpen && (
          <span className="text-xs font-medium">
            {visibleSpecies.size}/{availableSpecies.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 bg-white rounded-md shadow-lg border border-gray-200 p-3 min-w-48 z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm">Weed Species</h3>
            <button
              onClick={() => {
                onToggleAll();
                setIsOpen(false);
              }}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {visibleSpecies.size === availableSpecies.length ? 'Hide All' : 'Show All'}
            </button>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableSpecies.map(({ species, count }) => {
              const isVisible = visibleSpecies.has(species);
              const speciesColor = getSpeciesColor(species);
              
              return (
                <div
                  key={species}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                  onClick={() => onSpeciesToggle(species)}
                >
                  <div className="flex items-center gap-2 flex-1">
                    {isVisible ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    )}
                    <div
                      className="w-3 h-3 rounded-full border border-gray-300"
                      style={{ backgroundColor: speciesColor }}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {species}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};