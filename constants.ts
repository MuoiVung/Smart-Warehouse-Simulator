import { Coord } from './types';

// Dimensions
export const SCREEN_W = 1600;
// Reduced height to account for header (64px) + tabs (40px) + margins
export const SCREEN_H = 760; 
// Reduced grid size (38px) allows ~20 rows (760/38), giving enough vertical margin for the Arc layout
export const GRID_SIZE = 38; 

export const UI_PANEL_WIDTH = 400;
export const MAP_WIDTH = SCREEN_W - UI_PANEL_WIDTH;

export const COLS = Math.floor(MAP_WIDTH / GRID_SIZE);
export const ROWS = Math.floor(SCREEN_H / GRID_SIZE);

// Locations
// Station placed on the right side
export const STATION_GRID_X = COLS - 4; 
export const STATION_GRID_Y = Math.floor(ROWS / 2);
export const STATION_COORD: Coord = { x: STATION_GRID_X, y: STATION_GRID_Y };
export const PICKING_AREA_COORD: Coord = { x: STATION_GRID_X - 1, y: STATION_GRID_Y };

// Colors (Hex equivalents of the RGB tuples provided)
export const COLORS = {
  BG: '#1e1e23', // (30, 30, 35)
  PANEL_BG: '#2d2d32', // (45, 45, 50)
  POD_NORMAL: '#00796b', // (0, 121, 107)
  POD_LIFTED: '#ffb300', // (255, 179, 0)
  POD_BORDER: '#c8c8c8', // (200, 200, 200)
  STATION: '#e91e63', // (233, 30, 99)
  PICK_AREA: '#2196f3', // (33, 150, 243)
  ROBOT: '#64ffda', // (100, 255, 218)
  TEXT_WHITE: '#f0f0f0',
  TEXT_HIGHLIGHT: '#00ffff',
  TEXT_ORANGE: '#ffa500',
  LOG_HEAD: '#ffff00',
  LOG_SUCCESS: '#00ff00',
  LOG_ACTION: '#64c8ff',
};

// Hardcoded Data
export const POD_DISTANCES_MAP: Record<number, number> = {
  1: 22, 2: 26, 3: 26, 4: 26, 5: 26, 6: 26,
  7: 34, 8: 34, 9: 34, 10: 34, 11: 34, 12: 30,
  13: 34, 14: 34, 15: 34, 16: 34, 17: 34, 18: 34,
  19: 46, 20: 46, 21: 46, 22: 46, 23: 46, 24: 42
};

export const SCENARIO_2_CSV = `Order,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X
1,10,0,0,0,18,7,13,36,46,0,13,38,46,20,9,14,4,19,7,37,1,15,38,19
2,44,22,17,10,14,6,25,3,30,8,8,0,0,4,5,28,20,26,18,19,24,0,48,14
3,0,21,8,32,0,26,16,22,25,0,37,50,0,13,9,88,0,11,22,3,17,0,0,13
4,48,19,0,0,9,28,39,0,18,30,0,11,50,13,13,0,0,0,43,25,47,0,9,41
5,37,26,35,44,19,26,5,12,0,8,8,12,0,50,50,0,0,45,0,45,47,7,0,2
6,8,1,41,30,28,0,33,30,16,5,44,0,49,13,29,0,10,38,11,15,2,15,9,12
7,27,36,43,29,4,6,0,0,31,0,31,17,0,12,33,0,41,0,0,0,13,93,45,30
8,3,28,3,8,26,28,14,39,31,33,11,45,33,7,0,28,1,43,0,19,6,22,0,24
9,27,0,5,25,15,36,11,25,1,47,9,46,0,0,43,0,0,0,45,17,0,43,0,0
10,0,46,16,2,13,21,50,0,5,27,9,17,0,3,6,1,11,29,10,0,22,22,85,7
11,43,45,39,29,41,0,32,15,23,0,6,13,50,21,0,0,0,0,41,23,30,0,0,0
12,9,1,5,39,1,32,9,23,31,0,38,0,0,13,37,11,50,25,8,27,2,37,0,40
13,4,25,40,29,41,47,10,39,2,0,2,11,0,22,15,9,36,6,0,26,25,22,13,22
14,38,11,21,6,0,0,0,0,0,26,18,13,44,24,44,27,30,0,31,44,18,5,28,20
15,0,0,4,2,2,9,12,36,19,32,34,0,6,50,0,68,53,38,28,0,6,14,5,49`;