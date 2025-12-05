import React, { useState } from 'react';
import { SimulationCore } from '../services/simulationLogic';
import { Action, WarehouseInventory } from '../types';
import { PlayCircle } from 'lucide-react';

interface ValidationViewProps {
  initialActions: Action[];
  initialWarehouse: WarehouseInventory;
}

export const ValidationView: React.FC<ValidationViewProps> = ({ initialActions, initialWarehouse }) => {
  const [result, setResult] = useState<{dist: number, logs: any[], valid: boolean} | null>(null);

  const runValidation = () => {
    // Create fresh instance
    const core = new SimulationCore();
    // Load fresh data
    core.loadActionData(JSON.parse(JSON.stringify(initialActions)), JSON.parse(JSON.stringify(initialWarehouse)));
    // Run
    const res = core.runValidation();
    setResult({
      dist: res.totalDist,
      logs: res.logs,
      valid: res.isValid // This logic needs to be robust in real scenarios
    });
  };

  return (
    <div className="flex w-full h-full bg-[#1e1e23] text-gray-200">
      <div className="flex-1 p-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Validation Mode</h1>
        
        <div className="mb-6">
          <p className="mb-4 text-gray-400">
            This mode runs the simulation logic instantly without visualization to calculate the deterministic total distance and verify order fulfillment.
          </p>
          <button 
            onClick={runValidation}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-colors"
          >
            <PlayCircle size={20} />
            Run Validation
          </button>
        </div>

        {result && (
           <div className="space-y-6">
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                 <h2 className="text-xl font-bold text-white mb-4">Results</h2>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-900 rounded">
                       <span className="block text-gray-400 text-sm">Status</span>
                       <span className={`text-2xl font-bold ${result.valid ? 'text-green-400' : 'text-red-400'}`}>
                          {result.valid ? "VALID" : "INVALID"}
                       </span>
                    </div>
                    <div className="p-4 bg-gray-900 rounded">
                       <span className="block text-gray-400 text-sm">Total Distance</span>
                       <span className="text-2xl font-bold text-cyan-400">{result.dist}</span>
                    </div>
                 </div>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                 <h3 className="text-lg font-bold text-white mb-3">Execution Logs</h3>
                 <div className="h-96 overflow-y-auto bg-black p-4 rounded font-mono text-sm border border-gray-700">
                    {result.logs.map((log, i) => (
                       <div key={i} className={`mb-1 ${
                          log.type === 'HEAD' ? 'text-yellow-300 font-bold' :
                          log.type === 'SUCCESS' ? 'text-green-400' :
                          log.type === 'ACTION' ? 'text-blue-300' : 
                          log.type === 'ERROR' ? 'text-red-500' : 'text-gray-300'
                       }`}>
                          {log.msg}
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};
