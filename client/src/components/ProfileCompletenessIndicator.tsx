import React from 'react';

interface ProfileCompletenessProps {
  percentage: number;
  onClick?: () => void;
}

export const ProfileCompletenessIndicator: React.FC<ProfileCompletenessProps> = ({
  percentage,
  onClick
}) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage === 100) return '#10b981'; // green
    if (percentage >= 70) return '#3b82f6'; // blue
    if (percentage >= 40) return '#f59e0b'; // orange
    return '#ef4444'; // red
  };

  return (
    <div
      className="relative cursor-pointer hover:scale-105 transition-transform active:scale-95 hover:opacity-90"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Profile ${percentage}% complete. Click to view details.`}
    >
      <svg width="120" height="120" className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="#e5e7eb"
          strokeWidth="10"
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke={getColor()}
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: getColor() }}>
            {percentage}%
          </div>
          <div className="text-xs text-gray-500">Complete</div>
        </div>
      </div>
    </div>
  );
};