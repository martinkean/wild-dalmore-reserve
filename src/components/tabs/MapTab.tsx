import React from 'react';
import { DalmoreMap } from '../map/DalmoreMap';
import { useGeolocation } from '../../hooks/useGeolocation';
import { GPSPosition } from '../../types';

interface MapTabProps {
  onLocationCapture?: (position: GPSPosition) => void;
  onCenterLocation?: () => void;
  onCenterReserve?: () => void;
}

export const MapTab: React.FC<MapTabProps> = ({ 
  onLocationCapture, 
  onCenterLocation,
  onCenterReserve 
}) => {
  const { position, accuracy } = useGeolocation({ watch: true });

  const handleMapClick = (clickPosition: GPSPosition) => {
    onLocationCapture?.(clickPosition);
  };

  return (
    <div className="h-full">
      <DalmoreMap
        currentPosition={position}
        accuracy={accuracy}
        onCenterLocation={onCenterLocation}
        onCenterReserve={onCenterReserve}
        onMapClick={handleMapClick}
      />
    </div>
  );
};