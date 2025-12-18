
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
      {/* --- Slider Section --- (Fixed Height: 96px) */}
      {!isValidationMode && (
        <div className="h-24 p-5 border-b border-gray-600 flex flex-col justify-center shrink-0">
          <label className="block text-white mb-2 font-bold text-sm">Speed: {speed.toFixed(1)}x</label>
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

      {/* --- Stats & Remaining Items Section --- (Fixed Height: 320px) */}
      <div className="h-[320px] p-5 border-b border-gray-600 shrink-0 flex flex-col overflow-hidden">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-cyan-400 uppercase tracking-wide">
            Total Distance: {state.totalDist}
          </h2>
        </div>
        
        <h3 className="text-xs font-bold text-cyan-400 mb-2 uppercase tracking-widest">REMAINING ITEMS</h3>
        <div className="flex-1 overflow-y-auto bg-black/20 rounded border border-gray-700/30 p-3">
          <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-[13px]">
            {Object.entries(state.currDemand).map(([item, qty]) => (
              <div key={item} className="flex gap-2 font-mono">
                <span className="text-gray-400">{item}:</span>
                <span className={clsx("font-bold", (qty as number) < 10 ? "text-orange-400" : "text-white")}>
                  {qty as number}
                </span>
              </div>
            ))}
            {Object.keys(state.currDemand).length === 0 && (
              <div className="text-gray-500 italic col-span-3 text-center py-4">No active demand</div>
            )}
          </div>
        </div>
      </div>

      {/* --- Logs Section --- (Expands to fill exactly the remaining space) */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#1a1a1e]">
         <div className="p-3 bg-gray-800/50 border-b border-gray-700 shrink-0">
            <span className="text-cyan-400 font-bold text-xs uppercase tracking-widest">SYSTEM LOGS</span>
         </div>
         <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed space-y-1 bg-black/10">
            {state.logs.map((log, idx) => {
               let colorClass = "text-gray-300";
               let prefix = "";
               if (log.type === 'HEAD') {
                 colorClass = "text-yellow-300 font-bold mt-1";
                 prefix = "► ";
               }
               if (log.type === 'SUCCESS') {
                 colorClass = "text-green-400";
                 prefix = "✓ ";
               }
               if (log.type === 'ACTION') {
                 colorClass = "text-blue-300";
                 prefix = "• ";
               }
               if (log.type === 'ERROR') {
                 colorClass = "text-red-500 font-bold";
                 prefix = "ERR: ";
               }
               
               return (
                 <div key={idx} className={clsx("break-words", colorClass)}>
                   {prefix}{log.msg}
                 </div>
               );
            })}
            <div ref={logsEndRef} />
         </div>
      </div>
    </div>
  );
};
