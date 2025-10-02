import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useGeolocation } from './hooks/useGeolocation';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { OfflineSyncStatus } from './components/OfflineSyncStatus';
import { AuthForm } from './components/auth/AuthForm';
import { TopHeader } from './components/layout/TopHeader';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { MapTab } from './components/tabs/MapTab';
import { TracksTab } from './components/tabs/TracksTab';
import { WeedsTab } from './components/tabs/WeedsTab';
import { PhotosTab } from './components/tabs/PhotosTab';
import { AdminTab } from './components/tabs/AdminTab';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('map');
  const [online, setOnline] = useState(navigator.onLine);
  const [currentPosition, setCurrentPosition] = useState<GPSPosition | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);

  const { user, profile, loading, loadUserProfile } = useAuth();
  
  // GPS tracking hook
  const { position, accuracy: gpsAccuracy } = useGeolocation({ watch: true });
  
  // Update position state when GPS position changes
  useEffect(() => {
    if (position) {
      setCurrentPosition(position);
    }
    if (gpsAccuracy !== null) {
      setAccuracy(gpsAccuracy);
    }
  }, [position, gpsAccuracy]);

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

  // Load user profile after user is available
  useEffect(() => {
    if (user && !loading) {
      loadUserProfile();
    }
  }, [user, loading, loadUserProfile]);

  const handleCenterLocation = () => {
    // This will be handled by the map component
    console.log('Center on current location');
  };

  const handleCenterReserve = () => {
    // This will be handled by the map component  
    console.log('Center on Dalmore Reserve');
  };

  const handleMapTabClick = () => {
    handleCenterReserve();
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-green-800 mb-2">Dalmore Reserve</h2>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show authentication form if not logged in
  if (!user) {
    return <AuthForm />;
  }

  // Show loading after auth but before profile loads
  if (user && !profile) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-green-800 mb-2">Dalmore Reserve</h2>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'map':
        return (
          <MapTab 
            currentPosition={currentPosition}
            accuracy={accuracy}
            onCenterLocation={handleCenterLocation}
            onCenterReserve={handleCenterReserve}
          />
        );
      case 'tracks':
        return <TracksTab />;
      case 'weeds':
        return <WeedsTab />;
      case 'photos':
        return <PhotosTab />;
      case 'admin':
        return <AdminTab />;
      default:
        return (
          <MapTab 
            onCenterLocation={handleCenterLocation}
            onCenterReserve={handleCenterReserve}
          />
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <TopHeader 
        online={online} 
        currentPosition={currentPosition}
        accuracy={accuracy}
        onCenterLocation={handleCenterLocation}
      />
      
      <OfflineSyncStatus />
      
      <main className="flex-1 overflow-hidden">
        {renderActiveTab()}
      </main>

      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onMapTabClick={handleMapTabClick}
      />

      <PWAInstallPrompt />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;