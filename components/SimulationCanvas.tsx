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
  onUpdate: () => void;
}

const LAYOUT = generateArcLayout();

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ engine, speed, isPlaying, onUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reqIdRef = useRef<number | null>(null);

  const draw = (ctx: CanvasRenderingContext2D, sim: SimulationCore) => {
    // Clear
    ctx.fillStyle = COLORS.BG;
    ctx.fillRect(0, 0, MAP_WIDTH, SCREEN_H);

    // Draw Station
    const sx = STATION_COORD.x * GRID_SIZE;
    const sy = STATION_COORD.y * GRID_SIZE;
    ctx.fillStyle = COLORS.STATION;
    ctx.beginPath();
    ctx.roundRect(sx, sy, GRID_SIZE, GRID_SIZE, 6);
    ctx.fill();
    ctx.fillStyle = COLORS.TEXT_WHITE;
    ctx.font = "bold 11px Arial";
    ctx.fillText("STATION", sx + 2, sy + 20);

    // Draw Picking Area
    const px = PICKING_AREA_COORD.x * GRID_SIZE;
    const py = PICKING_AREA_COORD.y * GRID_SIZE;
    ctx.strokeStyle = COLORS.PICK_AREA;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, GRID_SIZE, GRID_SIZE, 6);
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
         ctx.fillStyle = COLORS.POD_LIFTED + "80"; // Hex with alpha
         ctx.beginPath();
         ctx.roundRect(rectX, rectY, rectSize, rectSize, 4);
         ctx.fill();
      } else {
        ctx.fillStyle = COLORS.POD_NORMAL;
        ctx.beginPath();
        ctx.roundRect(rectX, rectY, rectSize, rectSize, 4);
        ctx.fill();
        ctx.strokeStyle = COLORS.POD_BORDER;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Pod Label
      ctx.fillStyle = COLORS.TEXT_WHITE;
      ctx.font = "bold 12px Arial";
      ctx.fillText(`P${pid}`, cx + 4, cy + 14);

      // Inventory Preview
      const inv = sim.state.warehouse[pid] || {};
      let yOffset = 24;
      let count = 0;
      for (const [item, qty] of Object.entries(inv)) {
        if (count >= 2) {
          ctx.fillStyle = "#c8c8c8";
          ctx.font = "9px Arial";
          ctx.fillText("...", cx + 4, cy + yOffset);
          break;
        }
        ctx.fillStyle = "#dcdee0";
        ctx.font = "9px Arial";
        ctx.fillText(`${item}:${qty}`, cx + 4, cy + yOffset);
        yOffset += 10;
        count++;
      }
    });

    // Draw Robot
    const rx = sim.pixelPos.x;
    const ry = sim.pixelPos.y;
    ctx.fillStyle = COLORS.ROBOT;
    ctx.beginPath();
    ctx.arc(rx + GRID_SIZE/2, ry + GRID_SIZE/2, 8, 0, 2 * Math.PI);
    ctx.fill();
    // Robot glow
    ctx.shadowColor = COLORS.ROBOT;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
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
            onUpdate();
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && engine) {
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx, engine);
    }
  }, [engine]);

  return (
    <div className="relative border-r border-gray-700 h-full bg-[#1e1e23] flex items-center justify-center">
      <canvas 
        ref={canvasRef} 
        width={MAP_WIDTH} 
        height={SCREEN_H}
        className="block shadow-lg bg-[#1a1a1e]"
      />
    </div>
  );
};