import React, { useState } from 'react';
import { SimulationCore } from '../services/simulationLogic';
import { Action, WarehouseInventory, ValidationResult } from '../types';
import { PlayCircle, Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ValidationViewProps {
  initialActions: Action[];
  initialWarehouse: WarehouseInventory;
}

export const ValidationView: React.FC<ValidationViewProps> = ({ initialActions, initialWarehouse }) => {
  const [result, setResult] = useState<ValidationResult | null>(null);

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
        
        <div className="mb-6 flex gap-4">
          <button 
            onClick={runValidation}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-colors"
          >
            <PlayCircle size={20} />
            Run Validation
          </button>

          {result && (
            <button 
                onClick={downloadReport}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-colors"
            >
                <FileSpreadsheet size={20} />
                Download Excel Report
            </button>
          )}
        </div>

        {result ? (
           <div className="space-y-6">
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                 <h2 className="text-xl font-bold text-white mb-4">Results</h2>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-900 rounded border border-gray-700">
                       <span className="block text-gray-400 text-sm">Status</span>
                       <span className={`text-2xl font-bold ${result.isValid ? 'text-green-400' : 'text-red-500'}`}>
                          {result.isValid ? "VALID (All Orders Complete)" : "INVALID (Unfulfilled Orders)"}
                       </span>
                    </div>
                    <div className="p-4 bg-gray-900 rounded border border-gray-700">
                       <span className="block text-gray-400 text-sm">Total Distance</span>
                       <span className="text-2xl font-bold text-cyan-400">{result.totalDist}</span>
                    </div>
                 </div>
                 {!result.isValid && (
                     <div className="mt-4 p-4 bg-red-900/30 border border-red-500 rounded text-red-200 text-sm">
                         <strong>Failure detected:</strong> Some orders could not be fulfilled with the provided route. Check the downloaded report for missing items.
                     </div>
                 )}
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
        ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-gray-800/50 rounded-lg border border-gray-700 border-dashed">
                <p>Click "Run Validation" to verify order fulfillment and generate metrics.</p>
            </div>
        )}
      </div>
    </div>
  );
};