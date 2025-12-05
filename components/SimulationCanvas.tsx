import React, { useEffect, useRef, useState } from 'react';
import { SimulationCore, generateGridLayout } from '../services/simulationLogic';
import {
  GRID_SIZE,
  MAP_LOGICAL_WIDTH,
  MAP_LOGICAL_HEIGHT,
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

// Use Grid Layout now
const LAYOUT = generateGridLayout();

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ engine, speed, isPlaying, onUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reqIdRef = useRef<number | null>(null);
  const [scale, setScale] = useState(0.5); // Default scale

  // Responsive logic: Scale canvas to fit container
  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        // Calculate scale needed to fit the Logical dimensions into the rendered container
        const scaleX = (width - 40) / MAP_LOGICAL_WIDTH; // padding
        const scaleY = (height - 40) / MAP_LOGICAL_HEIGHT;
        
        // Choose the smaller scale to ensure full visibility without overflow
        const newScale = Math.min(scaleX, scaleY);
        setScale(newScale);
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);
    handleResize(); // Initial check

    return () => observer.disconnect();
  }, []);

  const draw = (ctx: CanvasRenderingContext2D, sim: SimulationCore) => {
    // Clear whole map
    ctx.fillStyle = COLORS.BG;
    ctx.fillRect(0, 0, MAP_LOGICAL_WIDTH, MAP_LOGICAL_HEIGHT);

    // Draw Picking Area (Yellow Box)
    const px = PICKING_AREA_COORD.x * GRID_SIZE;
    const py = PICKING_AREA_COORD.y * GRID_SIZE;
    ctx.fillStyle = COLORS.PICK_AREA; // Yellow
    ctx.beginPath();
    ctx.roundRect(px, py, GRID_SIZE, GRID_SIZE, 12);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Pa", px + GRID_SIZE/2, py + GRID_SIZE/2 + 8);

    // Draw Station (Orange Box)
    const sx = STATION_COORD.x * GRID_SIZE;
    const sy = STATION_COORD.y * GRID_SIZE;
    ctx.fillStyle = COLORS.STATION; // Orange
    ctx.beginPath();
    ctx.roundRect(sx, sy, GRID_SIZE, GRID_SIZE, 12);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Ps", sx + GRID_SIZE/2, sy + GRID_SIZE/2 + 8);

    // Draw Pods
    Object.entries(LAYOUT).forEach(([idStr, coord]) => {
      const pid = parseInt(idStr);
      const cx = coord.x * GRID_SIZE;
      const cy = coord.y * GRID_SIZE;
      const isCarried = sim.state.carryingPod === pid;

      const rectX = cx + 4;
      const rectY = cy + 4;
      const rectSize = GRID_SIZE - 8;

      if (isCarried) {
         ctx.fillStyle = COLORS.POD_LIFTED + "90"; // Slightly transparent
         ctx.beginPath();
         ctx.roundRect(rectX, rectY, rectSize, rectSize, 12);
         ctx.fill();
      } else {
        ctx.fillStyle = COLORS.POD_NORMAL; // Blue
        ctx.beginPath();
        ctx.roundRect(rectX, rectY, rectSize, rectSize, 12);
        ctx.fill();
        ctx.strokeStyle = COLORS.POD_BORDER;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Pod Label (Top Center)
      ctx.fillStyle = COLORS.TEXT_WHITE;
      ctx.textAlign = "center";
      ctx.font = "bold 32px Arial"; 
      ctx.fillText(`${pid}`, cx + GRID_SIZE/2, cy + 35);

      // Inventory Preview
      const inv = sim.state.warehouse[pid] || {};
      let yOffset = 60;
      let count = 0;
      for (const [item, qty] of Object.entries(inv)) {
        if (count >= 3) { // Show up to 3 items now
          ctx.fillStyle = "#cccccc";
          ctx.font = "bold 14px Arial";
          ctx.fillText("...", cx + GRID_SIZE/2, cy + yOffset - 5);
          break;
        }
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "bold 18px Arial";
        ctx.fillText(`${item}:${qty}`, cx + GRID_SIZE/2, cy + yOffset);
        yOffset += 20;
        count++;
      }
    });

    // Draw Robot
    const rx = sim.pixelPos.x;
    const ry = sim.pixelPos.y;
    ctx.fillStyle = COLORS.ROBOT;
    ctx.beginPath();
    ctx.arc(rx + GRID_SIZE/2, ry + GRID_SIZE/2, 25, 0, 2 * Math.PI); // Larger robot
    ctx.fill();
    
    // Robot glow/stroke
    ctx.shadowColor = COLORS.ROBOT;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 4;
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
        } else if (engine.state.finished) {
            // CRITICAL FIX: Ensure parent gets the final 'finished' state
            // even if update returns false (indicating no movement).
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
    <div 
      ref={containerRef} 
      className="relative border-r border-gray-700 h-full w-full bg-[#1e1e23] flex items-center justify-center overflow-hidden"
    >
      <canvas 
        ref={canvasRef} 
        width={MAP_LOGICAL_WIDTH} 
        height={MAP_LOGICAL_HEIGHT}
        className="block shadow-2xl bg-[#1a1a1e] origin-center rounded-lg"
        style={{
          transform: `scale(${scale})`,
          // Smooth scaling
          transition: 'transform 0.1s linear'
        }}
      />
    </div>
  );
};