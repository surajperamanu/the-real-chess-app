import React from 'react';

interface PostGameScreenProps {
  result: string;
  stockfishAnalysis?: string;
  onReturnHome: () => void;
  isMultiplayer?: boolean;
}

const PostGameScreen: React.FC<PostGameScreenProps> = ({
  result,
  stockfishAnalysis,
  onReturnHome,
  isMultiplayer = false
}) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-95 z-50 animate-fade-in">
      <div className="text-center p-8 max-w-lg w-full">
        <h2 className="text-4xl font-bold text-white mb-6 animate-slide-in">
          {result}
        </h2>
        
        {stockfishAnalysis && (
          <p className="text-lg text-gray-300 mb-8 animate-slide-in">
            {stockfishAnalysis}
          </p>
        )}
        
        <button
          onClick={onReturnHome}
          className="px-8 py-4 bg-green-600 text-white text-xl font-semibold rounded-lg 
                   hover:bg-green-700 transition-colors duration-200 shadow-lg
                   transform hover:scale-105 transition-transform animate-slide-in"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default PostGameScreen; 