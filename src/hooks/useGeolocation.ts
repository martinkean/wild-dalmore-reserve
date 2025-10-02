import { useState, useEffect, useCallback } from 'react';
import { LocationState, GPSPosition } from '../types';

// Chrome-specific location request helper
const requestLocationPermission = async (): Promise<boolean> => {
  if (!navigator.permissions) return true; // Fallback for browsers without permissions API
  
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state !== 'denied';
  } catch (error) {
    console.warn('Permissions API not available:', error);
    return true; // Fallback to attempting location access
  }
};

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

export const useGeolocation = (options: UseGeolocationOptions = {}) => {
  const [locationState, setLocationState] = useState<LocationState>({
    position: null,
    accuracy: null,
    isTracking: false,
    error: null,
  });

  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 60000,
    watch = false,
  } = options;

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const newPosition: GPSPosition = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };

    setLocationState(prev => ({
      ...prev,
      position: newPosition,
      accuracy: position.coords.accuracy,
      error: null,
    }));
  }, []);

  const handleError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = 'Unknown location error';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location access denied. Please enable location services.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable.';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out.';
        break;
    }

    setLocationState(prev => ({
      ...prev,
      error: errorMessage,
      isTracking: false,
    }));
  }, []);

  const getCurrentPosition = useCallback(async (): Promise<GPSPosition | null> => {
    if (!navigator.geolocation) {
      setLocationState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by this browser.',
      }));
      return null;
    }

    // Check permissions first (Chrome-friendly)
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      setLocationState(prev => ({
        ...prev,
        error: 'Location access denied. Please enable location services and reload the page.',
      }));
      return null;
    }

    setLocationState(prev => ({
      ...prev,
      isTracking: true,
      error: null,
    }));

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gpsPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          handleSuccess(position);
          setLocationState(prev => ({ ...prev, isTracking: false }));
          resolve(gpsPosition);
        },
        (error) => {
          handleError(error);
          resolve(null);
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge,
        }
      );
    });
  }, [enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by this browser.',
      }));
      return null;
    }

    setLocationState(prev => ({
      ...prev,
      isTracking: true,
      error: null,
    }));

    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );

    return watchId;
  }, [enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  const stopWatching = useCallback((watchId: number) => {
    navigator.geolocation.clearWatch(watchId);
    setLocationState(prev => ({
      ...prev,
      isTracking: false,
    }));
  }, []);

  useEffect(() => {
    let watchId: number | null = null;

    if (watch) {
      watchId = startWatching();
    }

    return () => {
      if (watchId !== null) {
        stopWatching(watchId);
      }
    };
  }, [watch, startWatching, stopWatching]);

  return {
    ...locationState,
    getCurrentPosition,
    startWatching,
    stopWatching,
  };
};