import React, { useEffect, useRef, useState } from 'react';

interface StockfishAnalysisProps {
  fen: string;
  isEnabled: boolean;
  depth: number;
  onAnalysis?: (analysis: string) => void;
}

declare global {
  interface Window {
    Stockfish: () => Worker;
  }
}

const StockfishAnalysis: React.FC<StockfishAnalysisProps> = ({ 
  fen, 
  isEnabled, 
  depth,
  onAnalysis 
}) => {
  const [evaluation, setEvaluation] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const engineRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (isEnabled && !engineRef.current) {
      engineRef.current = new Worker('/stockfish.js');
      
      engineRef.current.onmessage = (e) => {
        const message = e.data;
        
        if (typeof message === 'string') {
          if (message.startsWith('info depth') && message.includes('score cp')) {
            const scoreMatch = message.match(/score cp (-?\d+)/);
            if (scoreMatch) {
              const score = parseInt(scoreMatch[1]) / 100;
              const formattedScore = score > 0 ? `+${score.toFixed(1)}` : score.toFixed(1);
              const advantage = score > 0 ? "White" : "Black";
              const analysisText = `${advantage} advantage: ${formattedScore}`;
              setEvaluation(analysisText);
              if (onAnalysis) {
                onAnalysis(analysisText);
              }
              setIsAnalyzing(false);
            }
          }
        }
      };

      engineRef.current.postMessage('uci');
      engineRef.current.postMessage('isready');
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.terminate();
        engineRef.current = null;
      }
    };
  }, [isEnabled, onAnalysis]);

  useEffect(() => {
    if (isEnabled && engineRef.current && fen) {
      setIsAnalyzing(true);
      engineRef.current.postMessage('position fen ' + fen);
      engineRef.current.postMessage('go depth ' + depth);
    }
  }, [fen, isEnabled, depth]);

  if (!isEnabled) return null;

  return (
    <div className="mt-4 p-4 bg-gray-100 rounded-lg">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Position Analysis</h3>
        {isAnalyzing ? (
          <div className="text-gray-600">Analyzing position...</div>
        ) : (
          <div className="text-xl font-bold">
            {evaluation && `Advantage: ${evaluation}`}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockfishAnalysis; 