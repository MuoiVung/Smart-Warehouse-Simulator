import {
  COLS,
  ROWS,
  STATION_COORD,
  PICKING_AREA_COORD,
  POD_DISTANCES_MAP,
  SCENARIO_2_CSV,
  GRID_SIZE
} from '../constants';
import {
  Action,
  Coord,
  Demand,
  LogEntry,
  OrderData,
  SimulationState,
  ValidationResult,
  WarehouseInventory,
  ReportOverviewRow,
  InventorySnapshotRow
} from '../types';
import Papa from 'papaparse';

// --- Helper Functions ---

export function generateArcLayout(): Record<number, Coord> {
  const layout: Record<number, Coord> = {};
  const pods = Array.from({ length: 24 }, (_, i) => i + 1);
  const centerX = STATION_COORD.x;
  const centerY = STATION_COORD.y;

  const layersConfig = [5, 7, 12];
  let currentPodIdx = 0;
  const startAngleDeg = 110;
  const endAngleDeg = 250;
  let currentRadius = 2;

  for (const numPodsInLayer of layersConfig) {
    currentRadius += 2;
    const angleStep = numPodsInLayer > 1
      ? (endAngleDeg - startAngleDeg) / (numPodsInLayer - 1)
      : 0;

    for (let i = 0; i < numPodsInLayer; i++) {
      if (currentPodIdx >= pods.length) break;

      const angleRad = (startAngleDeg + i * angleStep) * (Math.PI / 180);
      let gx = Math.floor(centerX + currentRadius * Math.cos(angleRad));
      let gy = Math.floor(centerY + currentRadius * Math.sin(angleRad));

      gx = Math.max(0, Math.min(gx, COLS - 1));
      gy = Math.max(0, Math.min(gy, ROWS - 1));

      // Avoid collisions with existing pods or station
      while (
        Object.values(layout).some(c => c.x === gx && c.y === gy) ||
        (gx === PICKING_AREA_COORD.x && gy === PICKING_AREA_COORD.y) ||
        (gx === STATION_COORD.x && gy === STATION_COORD.y)
      ) {
        gx -= 1;
      }

      layout[pods[currentPodIdx]] = { x: gx, y: gy };
      currentPodIdx++;
    }
  }
  return layout;
}

const LAYOUT_COORDS = generateArcLayout();

export function findPathBFS(start: Coord, target: Coord, obstacles: Set<string>): Coord[] {
  if (start.x === target.x && start.y === target.y) return [];

  const queue: Coord[] = [start];
  const cameFrom: Record<string, Coord | null> = { [`${start.x},${start.y}`]: null };
  const directions = [
    { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 }
  ];

  const targetKey = `${target.x},${target.y}`;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentKey = `${current.x},${current.y}`;

    if (currentKey === targetKey) break;

    for (const d of directions) {
      const next: Coord = { x: current.x + d.x, y: current.y + d.y };
      const nextKey = `${next.x},${next.y}`;

      if (next.x >= 0 && next.x < COLS && next.y >= 0 && next.y < ROWS) {
        if (!(nextKey in cameFrom)) {
          if (!obstacles.has(nextKey) || nextKey === targetKey) {
            queue.push(next);
            cameFrom[nextKey] = current;
          }
        }
      }
    }
  }

  if (!(targetKey in cameFrom)) return [];

  const path: Coord[] = [];
  let curr: Coord | null = target;
  while (curr && (curr.x !== start.x || curr.y !== start.y)) {
    path.push(curr);
    const k = `${curr.x},${curr.y}`;
    curr = cameFrom[k];
  }
  return path.reverse();
}

// --- Logic Core ---

export class SimulationCore {
  state: SimulationState;
  actionQueue: Action[];
  ordersGt: OrderData;
  targetPath: Coord[];
  pixelPos: Coord;
  gridPos: Coord;
  tempPicked: Demand;
  layoutCoords: Record<number, Coord>;
  
  constructor() {
    this.layoutCoords = LAYOUT_COORDS;
    this.ordersGt = this.parseOrdersGT();
    this.actionQueue = [];
    
    // Initial State
    this.gridPos = { ...PICKING_AREA_COORD };
    this.pixelPos = { x: this.gridPos.x * GRID_SIZE, y: this.gridPos.y * GRID_SIZE };
    this.targetPath = [];
    this.tempPicked = {};

    this.state = {
      totalDist: 0,
      logs: [],
      currOrderId: "WAITING",
      currDemand: {},
      carryingPod: null,
      finished: false,
      warehouse: {}
    };
  }

  private parseOrdersGT(): OrderData {
    const results = Papa.parse(SCENARIO_2_CSV, { header: true, skipEmptyLines: true });
    const orders: OrderData = {};
    const data = results.data as any[];
    
    data.forEach((row) => {
      const oid = parseInt(row['Order']);
      const demand: Demand = {};
      Object.keys(row).forEach(k => {
        if (k !== 'Order') {
          const val = parseInt(row[k]);
          if (val > 0) demand[k] = val;
        }
      });
      orders[oid] = demand;
    });
    return orders;
  }

  public loadActionData(actions: Action[], warehouse: WarehouseInventory) {
    this.actionQueue = actions;
    this.state.warehouse = JSON.parse(JSON.stringify(warehouse)); // Deep copy
  }

  public getObstacles(): Set<string> {
    const obs = new Set<string>();
    Object.entries(this.layoutCoords).forEach(([pidStr, coord]) => {
      if (parseInt(pidStr) !== this.state.carryingPod) {
        obs.add(`${coord.x},${coord.y}`);
      }
    });
    obs.add(`${STATION_COORD.x},${STATION_COORD.y}`);
    return obs;
  }

  public log(msg: string, type: LogEntry['type']) {
    this.state.logs.push({ msg, type, timestamp: Date.now() });
  }

  // --- REPORT GENERATION HELPERS ---

  private getSnapshot(warehouse: WarehouseInventory, stepName: string): InventorySnapshotRow {
    const row: InventorySnapshotRow = { Step: stepName };
    for (let pid = 1; pid <= 24; pid++) {
        const items = warehouse[pid] || {};
        const parts: string[] = [];
        Object.entries(items).forEach(([k, v]) => {
            if (v > 0) parts.push(`${k}:${v}`);
        });
        row[`Pod ${pid}`] = parts.length > 0 ? parts.join('\n') : '(Empty)';
    }
    return row;
  }

  // Used for validation mode (Headless)
  public runDetailedValidation(): ValidationResult {
    const snapshots: InventorySnapshotRow[] = [];
    const reportOverview: ReportOverviewRow[] = [];
    const validationLogs: LogEntry[] = [];
    let totalDist = 0;
    let isOverallValid = true;

    // 1. Initial Snapshot
    snapshots.push(this.getSnapshot(this.state.warehouse, "Start (Initial)"));

    // 2. Iterate Queue to process orders
    // We need to simulate the flow: START -> MOVES/LIFTS -> PROCESS -> END
    // We will group actions by Order implicitly by following the queue
    
    // Temp state for loop
    let currentOrderValid = true;
    let currentOrderDist = 0;
    let currentOrderId = -1;
    let currentDemand: Demand = {};
    let tempPicked: Demand = {};
    
    // Helper to log within validation context
    const logVal = (msg: string, type: LogEntry['type']) => {
        validationLogs.push({ msg, type, timestamp: Date.now() });
    };

    // Deep copy action queue to not consume the main one if we reused this instance
    const queue = JSON.parse(JSON.stringify(this.actionQueue)) as Action[];

    while (queue.length > 0) {
        const act = queue.shift()!;

        if (act.t === 'START') {
            currentOrderId = act.id!;
            currentDemand = { ...act.d }; // Clone demand
            currentOrderDist = 0;
            currentOrderValid = true;
            logVal(`► START ORD ${currentOrderId}`, "HEAD");
        }
        else if (act.t === 'LIFT') {
            const pid = act.pid!;
            if (pid in this.state.warehouse) {
                tempPicked = {};
                for (const [item, qty] of Object.entries(currentDemand)) {
                    const avail = this.state.warehouse[pid][item] || 0;
                    if (avail > 0) {
                        const take = Math.min(qty, avail);
                        this.state.warehouse[pid][item] -= take;
                        tempPicked[item] = take;
                    }
                }
            }
        }
        else if (act.t === 'PROCESS') {
            const pid = act.pid!;
            const d = POD_DISTANCES_MAP[pid] || 0;
            currentOrderDist += d;
            totalDist += d;

            const dropped: string[] = [];
            const removes: string[] = [];
            for (const [item, qty] of Object.entries(tempPicked)) {
                if (item in currentDemand) {
                    currentDemand[item] -= qty;
                    dropped.push(item);
                    if (currentDemand[item] === 0) removes.push(item);
                }
            }
            removes.forEach(r => delete currentDemand[r]);
            tempPicked = {}; // Clear hand
            if (dropped.length > 0) logVal(`Processed items from P${pid}`, "SUCCESS");
        }
        else if (act.t === 'END_ORD') {
            // End of Order Check
            const missingItems = Object.keys(currentDemand);
            const status = missingItems.length === 0 ? 'PASS' : 'FAIL';
            const missingText = missingItems.join(', ');

            if (status === 'FAIL') {
                isOverallValid = false;
                logVal(`⚠ ORD ${currentOrderId} FAILED. Missing: ${missingText}`, "ERROR");
            } else {
                logVal(`✓ ORD ${currentOrderId} COMPLETE`, "HEAD");
            }

            // Record Overview
            reportOverview.push({
                Order: currentOrderId,
                Status: status,
                Missing: missingText,
                Distance: currentOrderDist
            });

            // Record Snapshot
            snapshots.push(this.getSnapshot(this.state.warehouse, `After Order ${currentOrderId}`));
        }
    }

    return {
      totalDist,
      logs: validationLogs,
      isValid: isOverallValid,
      reportOverview,
      inventorySnapshots: snapshots
    };
  }

  // Returns true if visual update happened, false if simulation finished
  public update(speedMultiplier: number): boolean {
    if (this.state.finished) return false;

    // Movement Logic
    if (this.targetPath.length > 0) {
      const targetGrid = this.targetPath[0];
      const targetPx = targetGrid.x * GRID_SIZE;
      const targetPy = targetGrid.y * GRID_SIZE;

      const dx = targetPx - this.pixelPos.x;
      const dy = targetPy - this.pixelPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const baseSpeed = 5;
      const currentSpeed = baseSpeed * speedMultiplier;

      if (dist > currentSpeed) {
        this.pixelPos.x += (dx / dist) * currentSpeed;
        this.pixelPos.y += (dy / dist) * currentSpeed;
      } else {
        this.pixelPos.x = targetPx;
        this.pixelPos.y = targetPy;
        this.gridPos = { ...targetGrid };
        this.targetPath.shift();
      }
      return true;
    }

    // Process Actions
    if (this.actionQueue.length > 0) {
      this.processNextAction(false);
      return true;
    } else {
      this.state.finished = true;
      this.log("Simulation Finished", "SUCCESS");
      return false;
    }
  }

  private processNextAction(instant: boolean) {
    const act = this.actionQueue[0];

    switch (act.t) {
      case 'START':
        this.state.currOrderId = act.id!;
        this.state.currDemand = { ...act.d }; // Clone
        this.log(`► START ORD ${act.id}`, "HEAD");
        this.actionQueue.shift();
        break;

      case 'MOVE':
        if (!instant) {
           const pid = act.pid!;
           if (pid in this.layoutCoords) {
             this.targetPath = findPathBFS(this.gridPos, this.layoutCoords[pid], this.getObstacles());
           }
        }
        this.actionQueue.shift();
        break;

      case 'LIFT':
        this.state.carryingPod = act.pid!;
        this.log(`Lift Pod ${act.pid}`, "ACTION");
        if (act.pid! in this.state.warehouse) {
          this.tempPicked = {};
          // Take items
          for (const [item, qty] of Object.entries(this.state.currDemand)) {
            const avail = this.state.warehouse[act.pid!][item] || 0;
            if (avail > 0) {
              const take = Math.min(qty, avail);
              this.state.warehouse[act.pid!][item] -= take;
              this.tempPicked[item] = take;
            }
          }
        }
        this.actionQueue.shift();
        break;

      case 'RETURN':
        if (!instant) {
          this.targetPath = findPathBFS(this.gridPos, PICKING_AREA_COORD, this.getObstacles());
        }
        this.actionQueue.shift();
        break;

      case 'PROCESS':
        const pid = act.pid!;
        const tripDist = POD_DISTANCES_MAP[pid] || 0;
        this.state.totalDist += tripDist;

        const dropped: string[] = [];
        const removes: string[] = [];
        
        for (const [item, qty] of Object.entries(this.tempPicked)) {
          if (item in this.state.currDemand) {
            this.state.currDemand[item] -= qty;
            dropped.push(item);
            if (this.state.currDemand[item] === 0) {
              removes.push(item);
            }
          }
        }
        removes.forEach(r => delete this.state.currDemand[r]);

        if (dropped.length > 0) {
          this.log(`Pick: ${dropped.join(',')} (Dist+${tripDist})`, "SUCCESS");
        }
        
        this.state.carryingPod = null;
        this.actionQueue.shift();
        break;

      case 'END_ORD':
        // Validation check for this order
        const leftOver = Object.keys(this.state.currDemand).length;
        if (leftOver > 0) {
           this.log(`⚠ ORD ${this.state.currOrderId} Incomplete!`, "ERROR");
        } else {
           this.log(`✓ DONE ORD ${this.state.currOrderId}`, "HEAD");
        }
        this.actionQueue.shift();
        break;
        
      default:
        this.actionQueue.shift();
        break;
    }
  }
}