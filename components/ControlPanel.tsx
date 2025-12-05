import React, { useEffect, useRef } from 'react';
import { SimulationState, LogEntry } from '../types';
import { UI_PANEL_WIDTH, COLORS } from '../constants';
import clsx from 'clsx';

interface ControlPanelProps {
  state: SimulationState | null;
  speed: number;
  setSpeed: (v: number) => void;
  isValidationMode?: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ state, speed, setSpeed, isValidationMode }) => {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state?.logs.length]);

  if (!state) return <div className="p-4 text-gray-400">Waiting for file...</div>;

  return (
    <div 
      className="bg-[#2d2d32] flex flex-col h-full border-l border-gray-700" 
      style={{ width: UI_PANEL_WIDTH }}
    >
      {/* --- Slider Section --- */}
      {!isValidationMode && (
        <div className="p-5 border-b border-gray-600">
          <label className="block text-white mb-2 font-bold">Speed: {speed.toFixed(1)}x</label>
          <input 
            type="range" 
            min="1" 
            max="50" 
            step="1"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      )}

      {/* --- Stats Section --- */}
      <div className="p-5 border-b border-gray-600">
        <h2 className="text-xl font-bold text-cyan-400 mb-4">
          Total Dist (Logic): {state.totalDist}
        </h2>
        
        <h3 className="text-md font-bold text-cyan-400 mb-2">REMAINING ITEMS</h3>
        <div className="grid grid-cols-3 gap-2 text-sm overflow-y-auto max-h-[150px]">
          {Object.entries(state.currDemand).map(([item, qty]) => (
            <div key={item} className={clsx("font-mono", (qty as number) < 10 ? "text-orange-400" : "text-white")}>
              {item}: {qty as number}
            </div>
          ))}
          {Object.keys(state.currDemand).length === 0 && (
            <span className="text-gray-500 col-span-3">No active demand</span>
          )}
        </div>
      </div>

      {/* --- Logs Section --- */}
      <div className="flex-1 flex flex-col min-h-0">
         <div className="p-3 bg-gray-800 border-b border-gray-700">
            <span className="text-cyan-400 font-bold">SYSTEM LOGS</span>
         </div>
         <div className="flex-1 overflow-y-auto p-3 font-mono text-sm space-y-1 bg-[#1e1e23]">
            {state.logs.map((log, idx) => {
               let colorClass = "text-gray-200";
               if (log.type === 'HEAD') colorClass = "text-yellow-300 font-bold";
               if (log.type === 'SUCCESS') colorClass = "text-green-400";
               if (log.type === 'ACTION') colorClass = "text-blue-300";
               if (log.type === 'ERROR') colorClass = "text-red-500 font-bold";
               
               return (
                 <div key={idx} className={colorClass}>
                   {log.msg}
                 </div>
               );
            })}
            <div ref={logsEndRef} />
         </div>
      </div>
    </div>
  );
};