import React from 'react';
import { Wifi, WifiOff, Upload, Cloud, AlertCircle } from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';

export const OfflineSyncStatus: React.FC = () => {
  const { isSyncing, syncStatus, online, hasOfflineData, syncOfflineData, pendingCount } = useOfflineSync();

  if (!hasOfflineData && online) {
    return null;
  }

  return (
    <div className="fixed top-16 left-4 right-4 z-40">
      {/* Online/Offline Status */}
      <div className={`mb-2 px-4 py-2 rounded-md text-center text-sm font-medium ${
        online 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        <div className="flex items-center justify-center gap-2">
          {online ? (
            <>
              <Wifi className="h-4 w-4" />
              Online
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              Offline - Data saved locally
            </>
          )}
        </div>
      </div>

      {/* Sync Status */}
      {(hasOfflineData || isSyncing) && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isSyncing ? (
                <>
                  <Upload className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">
                    {syncStatus || 'Syncing...'}
                  </span>
                </>
              ) : (
                <>
                  <Cloud className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {pendingCount} item{pendingCount !== 1 ? 's' : ''} pending sync
                  </span>
                </>
              )}
            </div>
            
            {hasOfflineData && online && !isSyncing && (
              <button
                onClick={syncOfflineData}
                className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Sync Now
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};