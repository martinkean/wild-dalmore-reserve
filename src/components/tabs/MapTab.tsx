import React from 'react';
import { DalmoreMap } from '../map/DalmoreMap';
import { GPSPosition } from '../../types';

interface MapTabProps {
  currentPosition: GPSPosition | null;
  accuracy: number | null;
  onLocationCapture?: (position: GPSPosition) => void;
  onCenterLocation?: () => void;
  onCenterReserve?: () => void;
}

export const MapTab: React.FC<MapTabProps> = ({ 
  currentPosition,
  accuracy,
  onLocationCapture, 
  onCenterLocation,
  onCenterReserve 
}) => {

  const handleMapClick = (clickPosition: GPSPosition) => {
    onLocationCapture?.(clickPosition);
  };

  return (
    <div className="h-full">
      <DalmoreMap
        currentPosition={currentPosition}
        accuracy={accuracy}
        onCenterLocation={onCenterLocation}
        onCenterReserve={onCenterReserve}
        onMapClick={handleMapClick}
      />
    </div>
  );
};