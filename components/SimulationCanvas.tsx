import React, { useEffect, useRef } from 'react';
import { SimulationCore, generateArcLayout } from '../services/simulationLogic';
import {
  GRID_SIZE,
  MAP_WIDTH,
  SCREEN_H,
  COLORS,
  STATION_COORD,
  PICKING_AREA_COORD
} from '../constants';

interface SimulationCanvasProps {
  engine: SimulationCore | null;
  speed: number;
  isPlaying: boolean;
  onUpdate: () => void; // Trigger UI update
}

const LAYOUT = generateArcLayout();

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ engine, speed, isPlaying, onUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reqIdRef = useRef<number>();

  const draw = (ctx: CanvasRenderingContext2D, sim: SimulationCore) => {
    // Clear
    ctx.fillStyle = COLORS.BG;
    ctx.fillRect(0, 0, MAP_WIDTH, SCREEN_H);

    // Draw Station
    const sx = STATION_COORD.x * GRID_SIZE;
    const sy = STATION_COORD.y * GRID_SIZE;
    ctx.fillStyle = COLORS.STATION;
    ctx.beginPath();
    ctx.roundRect(sx, sy, GRID_SIZE, GRID_SIZE, 8);
    ctx.fill();
    ctx.fillStyle = COLORS.TEXT_WHITE;
    ctx.font = "bold 14px Arial";
    ctx.fillText("STATION", sx + 2, sy + 20);

    // Draw Picking Area
    const px = PICKING_AREA_COORD.x * GRID_SIZE;
    const py = PICKING_AREA_COORD.y * GRID_SIZE;
    ctx.strokeStyle = COLORS.PICK_AREA;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(px, py, GRID_SIZE, GRID_SIZE, 8);
    ctx.stroke();

    // Draw Pods
    Object.entries(LAYOUT).forEach(([idStr, coord]) => {
      const pid = parseInt(idStr);
      const cx = coord.x * GRID_SIZE;
      const cy = coord.y * GRID_SIZE;
      const isCarried = sim.state.carryingPod === pid;

      const rectX = cx + 2;
      const rectY = cy + 2;
      const rectSize = GRID_SIZE - 4;

      if (isCarried) {
         ctx.fillStyle = COLORS.POD_LIFTED + "80"; // Hex with alpha (roughly 50%)
         ctx.beginPath();
         ctx.roundRect(rectX, rectY, rectSize, rectSize, 6);
         ctx.fill();
      } else {
        ctx.fillStyle = COLORS.POD_NORMAL;
        ctx.beginPath();
        ctx.roundRect(rectX, rectY, rectSize, rectSize, 6);
        ctx.fill();
        ctx.strokeStyle = COLORS.POD_BORDER;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Pod Label
      ctx.fillStyle = COLORS.TEXT_WHITE;
      ctx.font = "bold 14px Arial";
      ctx.fillText(`P${pid}`, cx + 5, cy + 15);

      // Inventory Preview
      const inv = sim.state.warehouse[pid] || {};
      let yOffset = 30;
      let count = 0;
      for (const [item, qty] of Object.entries(inv)) {
        if (count >= 3) {
          ctx.fillStyle = "#c8c8c8";
          ctx.font = "10px Arial";
          ctx.fillText("...", cx + 5, cy + yOffset);
          break;
        }
        ctx.fillStyle = "#dcdee0";
        ctx.font = "10px Arial";
        ctx.fillText(`${item}:${qty}`, cx + 5, cy + yOffset);
        yOffset += 11;
        count++;
      }
    });

    // Draw Robot
    const rx = sim.pixelPos.x;
    const ry = sim.pixelPos.y;
    ctx.fillStyle = COLORS.ROBOT;
    ctx.beginPath();
    ctx.arc(rx + GRID_SIZE/2, ry + GRID_SIZE/2, 10, 0, 2 * Math.PI);
    ctx.fill();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !engine) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initial Draw
    draw(ctx, engine);

    const animate = () => {
      if (isPlaying) {
        const active = engine.update(speed);
        if (active) {
            onUpdate(); // Sync React UI with Engine state occasionally? 
            // Ideally we don't spam React state updates every frame.
            // But for progress bar / distance update we might need to.
            // Let's rely on the parent updating via `useRef` reading if needed, 
            // or throttle this. For smooth UI, we'll call it.
        }
      }
      draw(ctx, engine);
      reqIdRef.current = requestAnimationFrame(animate);
    };

    reqIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
    };
  }, [engine, isPlaying, speed]);

  // Separate Effect to trigger draw on props change even if paused
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && engine) {
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx, engine);
    }
  }, [engine]); // Redraw if engine is reset

  return (
    <div className="relative border-r border-gray-700 h-full bg-[#1e1e23] overflow-hidden">
      <canvas 
        ref={canvasRef} 
        width={MAP_WIDTH} 
        height={SCREEN_H}
        className="block"
      />
    </div>
  );
};
