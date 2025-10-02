import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { MAP_CONFIG, DALMORE_BOUNDS, GPSPosition } from '../../types';
import { CurrentLocationMarker } from './CurrentLocationMarker';
import { GPSAccuracyIndicator } from './GPSAccuracyIndicator';
import { MapControls } from './MapControls';
import { TrackLayer } from './TrackLayer';
import { WeedPatchLayer } from './WeedPatchLayer';
import { PhotoMarkerLayer } from './PhotoMarkerLayer';
import { LayerControls } from './LayerControls';
import { Target, Satellite } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface DalmoreMapProps {
  currentPosition: GPSPosition | null;
  accuracy: number | null;
  onCenterLocation?: () => void;
  onCenterReserve?: () => void;
  onMapClick?: (position: GPSPosition) => void;
}

// Component to handle map bounds and center controls
const MapBoundsController: React.FC<{ currentPosition: GPSPosition | null }> = ({
  currentPosition,
}) => {
  const map = useMap();

  useEffect(() => {
    // Set max bounds to restrict map to Dalmore Reserve
    map.setMaxBounds(MAP_CONFIG.maxBounds);
    
    // Add reserve boundary
    const boundary = L.polygon([
      DALMORE_BOUNDS.northWest,
      DALMORE_BOUNDS.northEast,
      DALMORE_BOUNDS.southEast,
      DALMORE_BOUNDS.southWest,
    ], {
      color: '#059669',
      fillColor: '#059669',
      fillOpacity: 0.1,
      weight: 2,
    }).addTo(map);

    boundary.bindTooltip('Dalmore Reserve Boundary', {
      permanent: false,
      direction: 'center',
    });

    return () => {
      map.removeLayer(boundary);
    };
  }, [map]);

  return null;
};

export const DalmoreMap: React.FC<DalmoreMapProps> = ({
  currentPosition,
  accuracy,
  onCenterLocation,
  onCenterReserve,
  onMapClick,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [visibleSpecies, setVisibleSpecies] = useState<Set<string>>(new Set());

  const handleMapReady = (map: L.Map) => {
    mapRef.current = map;
    setMapInstance(map);
    
    // Call external center function if provided
    if (onCenterReserve) {
      onCenterReserve();
    }
  };

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng;
    onMapClick?.({ lat, lng });
  };

  const centerOnReserve = () => {
    if (mapInstance) {
      mapInstance.setView(MAP_CONFIG.center, MAP_CONFIG.zoom);
    }
    if (onCenterReserve) {
      onCenterReserve();
    }
  };

  const centerOnCurrentLocation = () => {
    if (mapInstance && currentPosition) {
      mapInstance.setView([currentPosition.lat, currentPosition.lng], MAP_CONFIG.zoom);
    }
    if (onCenterLocation) {
      onCenterLocation();
    }
  };

  const handleSpeciesToggle = (species: string) => {
    setVisibleSpecies(prev => {
      const newVisible = new Set(prev);
      if (newVisible.has(species)) {
        newVisible.delete(species);
      } else {
        newVisible.add(species);
      }
      return newVisible;
    });
  };

  const handleToggleAllSpecies = () => {
    // This will be handled by LayerControls to determine show all vs hide all
    setVisibleSpecies(new Set());
  };

  const getAccuracyColor = (acc: number) => {
    if (acc <= 5) return 'text-green-600';
    if (acc <= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAccuracyText = (acc: number) => {
    if (acc <= 5) return 'Excellent';
    if (acc <= 10) return 'Good';
    return 'Poor';
  };

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={MAP_CONFIG.center}
        zoom={MAP_CONFIG.zoom}
        minZoom={MAP_CONFIG.minZoom}
        maxZoom={MAP_CONFIG.maxZoom}
        className="h-full w-full z-0"
        whenReady={(e) => handleMapReady(e.target)}
        onClick={handleMapClick}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={MAP_CONFIG.maxZoom}
        />
        
        {/* Satellite layer option - can be toggled */}
        {/* <TileLayer
          attribution='Tiles &copy; Esri'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        /> */}

        <MapBoundsController currentPosition={currentPosition} />
        
        {currentPosition && (
          <CurrentLocationMarker position={currentPosition} accuracy={accuracy} />
        )}
        
        <TrackLayer />
        <WeedPatchLayer visibleSpecies={visibleSpecies} />
        <PhotoMarkerLayer />
      </MapContainer>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">        
        <LayerControls
          visibleSpecies={visibleSpecies}
          onSpeciesToggle={handleSpeciesToggle}
          onToggleAll={handleToggleAllSpecies}
        />
      </div>

      {/* Coordinate Display */}
      {currentPosition && (
        <div className="absolute bottom-20 left-4 bg-white bg-opacity-95 px-3 py-2 rounded-md text-sm font-mono z-10 shadow-lg border border-gray-200">
          <div className="font-medium text-gray-800">Lat: {currentPosition.lat.toFixed(6)}</div>
          <div className="font-medium text-gray-800">Lng: {currentPosition.lng.toFixed(6)}</div>
          {accuracy !== null && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${getAccuracyColor(accuracy)}`}>
              <Satellite className="h-3 w-3" />
              <span>{getAccuracyText(accuracy)}</span>
              <span>±{accuracy.toFixed(0)}m</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};