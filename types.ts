export interface Coord {
  x: number;
  y: number;
}

export interface Dictionary<T> {
  [key: string]: T;
}

export interface Demand {
  [item: string]: number;
}

export interface WarehouseInventory {
  [podId: number]: Demand;
}

export interface OrderData {
  [orderId: number]: Demand;
}

export interface LogEntry {
  msg: string;
  type: 'INFO' | 'HEAD' | 'SUCCESS' | 'ACTION' | 'ERROR';
  timestamp: number;
}

export interface Action {
  t: 'START' | 'MOVE' | 'LIFT' | 'RETURN' | 'PROCESS' | 'END_ORD';
  id?: number;
  pid?: number;
  d?: Demand;
}

export interface SimulationState {
  totalDist: number;
  logs: LogEntry[];
  currOrderId: string | number;
  currDemand: Demand;
  carryingPod: number | null;
  finished: boolean;
  warehouse: WarehouseInventory;
}

export interface ReportOverviewRow {
  Order: number;
  Status: 'PASS' | 'FAIL';
  Missing: string;
  Distance: number;
}

export interface InventorySnapshotRow {
  Step: string;
  [podLabel: string]: string; // "Pod 1": "A:100, B:20"
}

export interface ValidationResult {
  totalDist: number;
  logs: LogEntry[];
  isValid: boolean;
  reportOverview: ReportOverviewRow[];
  inventorySnapshots: InventorySnapshotRow[];
}