
import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Upload, Play, Pause, Square, Layout, RotateCcw, AlertCircle } from 'lucide-react';
import { SimulationCanvas } from './components/SimulationCanvas';
import { ControlPanel } from './components/ControlPanel';
import { ValidationView } from './components/ValidationView';
import { SimulationCore } from './services/simulationLogic';
import { Action, WarehouseInventory, SimulationState, OrderData, Demand } from './types';
import { SCENARIO_2_CSV } from './constants';
import clsx from 'clsx';

function App() {
  const [activeTab, setActiveTab] = useState<'sim' | 'val'>('sim');
  const [fileLoaded, setFileLoaded] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  
  // Data State
  const [rawActions, setRawActions] = useState<Action[]>([]);
  const [initialWarehouse, setInitialWarehouse] = useState<WarehouseInventory>({});
  
  // Simulation State
  const engineRef = useRef<SimulationCore | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  
  // Sync state for UI
  const [uiState, setUiState] = useState<SimulationState | null>(null);

  // Initialize Engine
  const initEngine = () => {
    const core = new SimulationCore();
    // Pre-load static data is done in constructor
    if (fileLoaded) {
      core.loadActionData(JSON.parse(JSON.stringify(rawActions)), JSON.parse(JSON.stringify(initialWarehouse)));
    }
    engineRef.current = core;
    setUiState(core.state);
  };

  useEffect(() => {
    // Initial Setup
    initEngine();
  }, []); // Run once

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });

      // 1. Parse Allocation (Sheet 0)
      const wsAlloc = wb.Sheets[wb.SheetNames[0]];
      const dataAlloc = XLSX.utils.sheet_to_json<any>(wsAlloc, { header: 1 });
      const warehouse: WarehouseInventory = {};
      
      dataAlloc.forEach((row: any[]) => {
        if (row && row.length > 2) {
          const podStr = String(row[0]);
          const podMatch = podStr.match(/\d+/);
          if (podMatch) {
            const pid = parseInt(podMatch[0]);
            const itemsStr = String(row[2]);
            if (itemsStr && itemsStr.toLowerCase() !== 'nan') {
              warehouse[pid] = {};
              itemsStr.split(',').forEach(item => {
                const i = item.trim();
                if (i) warehouse[pid][i] = 100;
              });
            }
          }
        }
      });

      // 2. Parse Orders GT
      const wsSum = wb.Sheets[wb.SheetNames[1]];
      const dataSum = XLSX.utils.sheet_to_json<any>(wsSum, { header: 1 });
      
      // Parse Scenario CSV for lookup
      const results = Papa.parse(SCENARIO_2_CSV, { header: true, skipEmptyLines: true });
      const ordersGt: OrderData = {};
      (results.data as any[]).forEach((row) => {
        const oid = parseInt(row['Order']);
        const demand: any = {};
        Object.keys(row).forEach(k => {
          if (k !== 'Order' && parseInt(row[k]) > 0) demand[k] = parseInt(row[k]);
        });
        ordersGt[oid] = demand;
      });

      const actions: Action[] = [];
      
      dataSum.forEach((row: any[]) => {
        if (row.length > 0) {
          const oid = parseInt(row[0]);
          if (!isNaN(oid)) {
             // START Action
             actions.push({ t: 'START', id: oid, d: {...ordersGt[oid]} });
             
             // Route parsing
             const routeStr = String(row[2]);
             const podSegments = routeStr.match(/Pod\d+\s*\([^)]+\)/g) || [];

             if (podSegments.length === 0) {
                // Fallback for old format (just numbers)
                const podsInRoute = routeStr.match(/\d+/g)?.map(Number) || [];
                podsInRoute.forEach(pid => {
                    actions.push({ t: 'MOVE', pid });
                    actions.push({ t: 'LIFT', pid }); // No specific picks, greedy default
                    actions.push({ t: 'RETURN', pid });
                    actions.push({ t: 'PROCESS', pid });
                });
             } else {
                 // Parse new format
                 podSegments.forEach(segment => {
                     // Extract Pod ID
                     const pidMatch = segment.match(/Pod(\d+)/);
                     if (!pidMatch) return;
                     const pid = parseInt(pidMatch[1]);

                     // Extract Items inside parens: "A:10, T:37"
                     const contentMatch = segment.match(/\((.*?)\)/);
                     const specificPicks: Demand = {};
                     
                     if (contentMatch && contentMatch[1]) {
                         const itemsParts = contentMatch[1].split(',');
                         itemsParts.forEach(part => {
                             const [item, qtyStr] = part.split(':').map(s => s.trim());
                             const qty = parseInt(qtyStr);
                             if (item && !isNaN(qty)) {
                                 specificPicks[item] = qty;
                             }
                         });
                     }

                     actions.push({ t: 'MOVE', pid });
                     // Pass specific picks to LIFT action
                     actions.push({ t: 'LIFT', pid, specificPicks }); 
                     actions.push({ t: 'RETURN', pid });
                     actions.push({ t: 'PROCESS', pid });
                 });
             }
             
             actions.push({ t: 'END_ORD' });
          }
        }
      });

      setInitialWarehouse(warehouse);
      setRawActions(actions);
      setFileLoaded(true);

      // Reset Engine with new data
      const core = new SimulationCore();
      core.loadActionData(actions, warehouse);
      engineRef.current = core;
      setUiState(core.state);
      setIsPlaying(false);
    };
    reader.readAsBinaryString(file);
  };

  const resetSimulation = () => {
    if (engineRef.current) {
        const core = new SimulationCore();
        core.loadActionData(JSON.parse(JSON.stringify(rawActions)), JSON.parse(JSON.stringify(initialWarehouse)));
        engineRef.current = core;
        setUiState(core.state);
    }
  };

  const handlePlayPause = () => {
    if (uiState?.finished) {
        // Replay Logic
        resetSimulation();
        // Use timeout to ensure state update propagates before starting loop
        setTimeout(() => setIsPlaying(true), 0);
    } else {
        // Toggle
        setIsPlaying(!isPlaying);
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    resetSimulation();
  };

  // Called by Canvas every frame to sync UI
  const handleSimUpdate = () => {
    if (engineRef.current) {
        setUiState({...engineRef.current.state}); 
        if (engineRef.current.state.finished && isPlaying) {
            setIsPlaying(false); // Stop the loop automatically when finished
        }
    }
  };

  // Determine Button State
  let mainButtonText = "PLAY";
  let MainButtonIcon = Play;
  let mainButtonColor = "bg-green-600 hover:bg-green-500";

  if (uiState?.finished) {
      mainButtonText = "REPLAY";
      MainButtonIcon = RotateCcw;
      mainButtonColor = "bg-blue-600 hover:bg-blue-500";
  } else if (isPlaying) {
      mainButtonText = "PAUSE";
      MainButtonIcon = Pause;
      mainButtonColor = "bg-yellow-600 hover:bg-yellow-500";
  } else if (uiState && (uiState.totalDist > 0 || uiState.logs.length > 0)) {
      mainButtonText = "CONTINUE";
      MainButtonIcon = Play;
      mainButtonColor = "bg-green-600 hover:bg-green-500";
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 overflow-hidden">
      {/* --- Top Bar --- */}
      <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 shrink-0 z-10 shadow-md">
         <div className="flex items-center gap-3">
            <Layout className="text-cyan-400" />
            <h1 className="text-white font-bold text-lg tracking-wide">Smart Warehouse Simulator</h1>
         </div>

         <div className="flex items-center gap-6">
            {/* File Input */}
            <div className="flex items-center gap-2">
               <label className="flex items-center gap-2 cursor-pointer bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors border border-slate-600">
                  <Upload size={16} />
                  {fileName ? 'Change File' : 'Upload Excel'}
                  <input type="file" accept=".xlsx" className="hidden" onChange={handleFileUpload} />
               </label>
               {fileName && <span className="text-gray-400 text-xs truncate max-w-[150px]">{fileName}</span>}
            </div>

            {/* Controls */}
            {fileLoaded && activeTab === 'sim' && (
                <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-700">
                   <button 
                      onClick={handlePlayPause}
                      className={clsx(
                         "flex items-center gap-2 px-4 py-1.5 rounded text-sm font-bold transition-colors text-white",
                         mainButtonColor
                      )}
                   >
                      <MainButtonIcon size={16} fill={mainButtonText === "PAUSE" ? "white" : "none"} />
                      {mainButtonText}
                   </button>
                   <button 
                      onClick={handleStop}
                      className="flex items-center gap-2 px-4 py-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded text-sm font-bold transition-colors"
                   >
                      <Square size={16} fill="white" />
                      STOP
                   </button>
                </div>
            )}
         </div>
      </header>

      {/* --- Tab Navigation --- */}
      <div className="bg-slate-800 px-6 flex items-end gap-1 border-b border-slate-700 shrink-0">
          <button 
             onClick={() => setActiveTab('sim')}
             className={clsx(
                "px-6 py-2 text-sm font-medium border-t-2 transition-colors",
                activeTab === 'sim' 
                   ? "bg-slate-900 border-cyan-400 text-cyan-400" 
                   : "bg-transparent border-transparent text-gray-400 hover:text-white"
             )}
          >
             Simulation View
          </button>
          <button 
             onClick={() => setActiveTab('val')}
             className={clsx(
                "px-6 py-2 text-sm font-medium border-t-2 transition-colors",
                activeTab === 'val' 
                   ? "bg-slate-900 border-cyan-400 text-cyan-400" 
                   : "bg-transparent border-transparent text-gray-400 hover:text-white"
             )}
          >
             Validation View
          </button>
      </div>

      {/* --- Main Content --- */}
      <div className="flex-1 flex overflow-hidden relative">
         {!fileLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-20 text-center p-6">
               <AlertCircle size={48} className="text-gray-500 mb-4" />
               <h2 className="text-xl font-bold text-white mb-2">No Scenario Data</h2>
               <p className="text-gray-400">Please upload an Excel file (.xlsx) containing Allocation and Route Summary sheets to begin.</p>
            </div>
         )}

         {activeTab === 'sim' ? (
             <>
               {/* Wrapper div for centering and responsive bounds */}
               <div className="flex-1 h-full relative flex flex-col items-center justify-center bg-[#1e1e23] overflow-hidden">
                  <SimulationCanvas 
                    engine={engineRef.current} 
                    speed={speed} 
                    isPlaying={isPlaying} 
                    onUpdate={handleSimUpdate} 
                  />
               </div>
               <ControlPanel 
                  state={uiState} 
                  speed={speed} 
                  setSpeed={setSpeed} 
               />
             </>
         ) : (
            <ValidationView 
               initialActions={rawActions}
               initialWarehouse={initialWarehouse}
            />
         )}
      </div>
    </div>
  );
}

export default App;
