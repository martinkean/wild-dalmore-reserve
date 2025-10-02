import React from 'react';
import { LogOut, Target, Satellite } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { GPSPosition } from '../../types';

interface TopHeaderProps {
  online: boolean;
  currentPosition: GPSPosition | null;
  accuracy: number | null;
  onCenterLocation: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ 
  online, 
  currentPosition, 
  accuracy, 
  onCenterLocation 
}) => {
  const { profile, signOut } = useAuth();
  

  return (
    <header className="bg-green-600 text-white p-4 flex justify-between items-center pt-8 safe-area-inset-top">
      <div>
        <h1 className="font-bold text-lg">Dalmore Reserve</h1>
        <p className="text-sm text-green-100">
          Welcome, {profile?.full_name} ({profile?.role})
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Target Button */}
        {currentPosition && (
          <button
            onClick={onCenterLocation}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-full transition-colors"
            title="My Location"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <Target className="h-5 w-5 text-white" />
          </button>
        )}
        
        {/* Sign Out Button */}
        <button
          onClick={signOut}
          className="p-2 rounded-full hover:bg-green-700 transition-colors"
          title="Sign Out"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};