import React from 'react';
import { Satellite } from 'lucide-react';

interface GPSAccuracyIndicatorProps {
  accuracy: number;
}

export const GPSAccuracyIndicator: React.FC<GPSAccuracyIndicatorProps> = ({
  accuracy,
}) => {
  const getAccuracyColor = (acc: number) => {
    if (acc <= 5) return 'text-green-600 bg-green-50 border-green-200';
    if (acc <= 10) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getAccuracyText = (acc: number) => {
    if (acc <= 5) return 'Excellent';
    if (acc <= 10) return 'Good';
    return 'Poor';
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${getAccuracyColor(accuracy)}`}>
      <Satellite className="h-4 w-4" />
      <span className="font-medium">{getAccuracyText(accuracy)}</span>
      <span className="text-xs">±{accuracy.toFixed(0)}m</span>
    </div>
  );
};