import React from 'react';
import { Target, Home } from 'lucide-react';

interface MapControlsProps {
  onCenterReserve: () => void;
  onCenterLocation: () => void;
  hasCurrentLocation: boolean;
}

export const MapControls: React.FC<MapControlsProps> = ({
  onCenterReserve,
  onCenterLocation,
  hasCurrentLocation,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onCenterReserve}
        className="bg-white hover:bg-gray-50 p-2 rounded-md shadow-md border border-gray-300"
        title="Center on Dalmore Reserve"
        style={{ minWidth: '44px', minHeight: '44px' }}
      >
        <Home className="h-5 w-5 text-gray-700" />
      </button>
      
      {hasCurrentLocation && (
        <button
          onClick={onCenterLocation}
          className="bg-white hover:bg-gray-50 p-2 rounded-md shadow-md border border-gray-300"
          title="Center on Current Location"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <Target className="h-5 w-5 text-blue-600" />
        </button>
      )}
    </div>
  );
};