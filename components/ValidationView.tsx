

import React, { useState, useEffect } from 'react';
import { SimulationCore, checkAllocationConstraints } from '../services/simulationLogic';
import { Action, WarehouseInventory, ValidationResult, AllocationAnalysis } from '../types';
import { PlayCircle, Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ValidationViewProps {
  initialActions: Action[];
  initialWarehouse: WarehouseInventory;
}

export const ValidationView: React.FC<ValidationViewProps> = ({ initialActions, initialWarehouse }) => {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [allocationAnalysis, setAllocationAnalysis] = useState<AllocationAnalysis | null>(null);

  useEffect(() => {
    // Run static check immediately when data is present
    if (Object.keys(initialWarehouse).length > 0) {
        setAllocationAnalysis(checkAllocationConstraints(initialWarehouse));
    }
  }, [initialWarehouse]);

  const runValidation = () => {
    // Create fresh instance
    const core = new SimulationCore();
    // Load fresh data
    core.loadActionData(JSON.parse(JSON.stringify(initialActions)), JSON.parse(JSON.stringify(initialWarehouse)));
    // Run Detailed Validation
    const res = core.runDetailedValidation();
    setResult(res);
  };

  const downloadReport = () => {
    if (!result) return;

    // 1. Overview Sheet
    const wsOverview = XLSX.utils.json_to_sheet(result.reportOverview);
    
    // 2. Inventory Table Sheet
    const wsInventory = XLSX.utils.json_to_sheet(result.inventorySnapshots);

    // Create Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsOverview, "Overview");
    XLSX.utils.book_append_sheet(wb, wsInventory, "Inventory_Table");

    // Download
    XLSX.writeFile(wb, "Validation_Report.xlsx");
  };

  return (
    <div className="flex w-full h-full bg-[#1e1e23] text-gray-200">
      <div className="flex-1 p-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Validation Mode</h1>

        {/* --- Allocation Constraints Report --- */}
        {allocationAnalysis && (
            <div className="mb-6 bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-4 border-b border-gray-600 pb-2">Allocation Constraints Check</h2>
                {allocationAnalysis.isValid ? (
                    <div className="text-green-400 font-bold flex items-center gap-2 bg-green-900/20 p-3 rounded">
                        <span>✅ All allocation rules passed.</span>
                    </div>
                ) : (
                    <div>
                        <div className="text-red-400 font-bold mb-3 flex items-center gap-2">
                             <span>❌ Constraints Violated ({allocationAnalysis.violations.length}):</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto pr-2">
                            <ul className="space-y-2">
                                {allocationAnalysis.violations.map((v, i) => (
                                    <li key={i} className="text-sm bg-red-900/20 p-2 rounded border border-red-900/50">
                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-red-900 text-red-200 mr-2 border border-red-700">
                                            {v.type.replace('_', ' ')}
                                        </span>
                                        <span className="text-gray-300">{v.message}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        )}
        
        <div className="mb-6 flex gap-4">
          <button 
            onClick={runValidation}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-cyan-900/50"
          >
            <PlayCircle size={20} />
            Run Validation
          </button>

          {result && (
            <button 
                onClick={downloadReport}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-green-900/50"
            >
                <FileSpreadsheet size={20} />
                Download Excel Report
            </button>
          )}
        </div>

        {result ? (
           <div className="space-y-6">
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
                 <h2 className="text-xl font-bold text-white mb-4 border-b border-gray-600 pb-2">Simulation Results</h2>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-900 rounded border border-gray-700">
                       <span className="block text-gray-400 text-sm mb-1">Fulfillment Status</span>
                       <span className={`text-2xl font-bold ${result.isValid ? 'text-green-400' : 'text-red-500'}`}>
                          {result.isValid ? "VALID (All Orders Complete)" : "INVALID (Unfulfilled Orders)"}
                       </span>
                    </div>
                    <div className="p-4 bg-gray-900 rounded border border-gray-700">
                       <span className="block text-gray-400 text-sm mb-1">Total Distance</span>
                       <span className="text-2xl font-bold text-cyan-400">{result.totalDist}</span>
                    </div>
                 </div>
                 {!result.isValid && (
                     <div className="mt-4 p-4 bg-red-900/30 border border-red-500 rounded text-red-200 text-sm">
                         <strong>Failure detected:</strong> Some orders could not be fulfilled with the provided route. Check the downloaded report for missing items.
                     </div>
                 )}
              </div>

              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
                 <h3 className="text-lg font-bold text-white mb-3">Execution Logs</h3>
                 <div className="h-80 overflow-y-auto bg-black p-4 rounded font-mono text-sm border border-gray-700">
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
        ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-gray-800/50 rounded-lg border border-gray-700 border-dashed">
                <p>Click "Run Validation" to verify order fulfillment and generate metrics.</p>
            </div>
        )}
      </div>
    </div>
  );
};
