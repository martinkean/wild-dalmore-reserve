import React from 'react';
import { Circle, Marker } from 'react-leaflet';
import { GPSPosition } from '../../types';
import L from 'leaflet';

interface CurrentLocationMarkerProps {
  position: GPSPosition;
  accuracy: number | null;
}

// Custom blue dot icon for current location
const currentLocationIcon = new L.DivIcon({
  className: 'current-location-marker',
  html: `
    <div style="
      width: 20px;
      height: 20px;
      background-color: #3B82F6;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export const CurrentLocationMarker: React.FC<CurrentLocationMarkerProps> = ({
  position,
  accuracy,
}) => {
  return (
    <>
      {/* Accuracy circle */}
      {accuracy && (
        <Circle
          center={[position.lat, position.lng]}
          radius={accuracy}
          color="#3B82F6"
          fillColor="#3B82F6"
          fillOpacity={0.1}
          weight={1}
        />
      )}
      
      {/* Current location marker */}
      <Marker
        position={[position.lat, position.lng]}
        icon={currentLocationIcon}
      />
    </>
  );
};