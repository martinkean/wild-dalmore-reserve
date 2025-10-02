import React from 'react';
import { Map, Route, TreePine, Camera, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onMapTabClick: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
  onMapTabClick,
}) => {
  const { isAdmin } = useAuth();

  const tabs = [
    { id: 'map', label: 'Map', icon: Map },
    { id: 'tracks', label: 'Tracks', icon: Route },
    { id: 'weeds', label: 'Weeds', icon: TreePine },
    { id: 'photos', label: 'Photos', icon: Camera },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: Settings }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => {
                if (id === 'map') {
                  onMapTabClick();
                }
                onTabChange(id);
              }}
              className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg transition-colors ${
                isActive
                  ? 'text-green-600 bg-green-50'
                  : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
              }`}
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};