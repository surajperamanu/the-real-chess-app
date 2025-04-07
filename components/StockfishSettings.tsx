import React from 'react';

interface StockfishSettingsProps {
  isEnabled: boolean;
  depth: number;
  onToggle: () => void;
  onDepthChange: (depth: number) => void;
}

const StockfishSettings: React.FC<StockfishSettingsProps> = ({
  isEnabled,
  depth,
  onToggle,
  onDepthChange,
}) => {
  return (
    <div className="flex items-center gap-4 mb-4">
      <button
        onClick={onToggle}
        className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${
          isEnabled
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        {isEnabled ? 'Disable Analysis' : 'Enable Analysis'}
      </button>
      
      {isEnabled && (
        <div className="flex items-center gap-2">
          <label className="font-medium">Depth:</label>
          <select
            value={depth}
            onChange={(e) => onDepthChange(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg bg-white"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default StockfishSettings; 