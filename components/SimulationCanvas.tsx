import React, { useEffect, useRef, useState } from 'react';
import { SimulationCore, generateArcLayout } from '../services/simulationLogic';
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

const LAYOUT = generateArcLayout();

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
        const scaleX = (width - 20) / MAP_LOGICAL_WIDTH; // -20 for padding
        const scaleY = (height - 20) / MAP_LOGICAL_HEIGHT;
        
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

    // Draw Station
    const sx = STATION_COORD.x * GRID_SIZE;
    const sy = STATION_COORD.y * GRID_SIZE;
    ctx.fillStyle = COLORS.STATION;
    ctx.beginPath();
    ctx.roundRect(sx, sy, GRID_SIZE, GRID_SIZE, 8);
    ctx.fill();
    ctx.fillStyle = COLORS.TEXT_WHITE;
    ctx.font = "bold 18px Arial"; // Larger
    ctx.textAlign = "center";
    ctx.fillText("STATION", sx + GRID_SIZE/2, sy + 45);

    // Draw Picking Area
    const px = PICKING_AREA_COORD.x * GRID_SIZE;
    const py = PICKING_AREA_COORD.y * GRID_SIZE;
    ctx.strokeStyle = COLORS.PICK_AREA;
    ctx.lineWidth = 4;
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
         ctx.fillStyle = COLORS.POD_LIFTED + "90"; // Slightly transparent
         ctx.beginPath();
         ctx.roundRect(rectX, rectY, rectSize, rectSize, 8);
         ctx.fill();
      } else {
        ctx.fillStyle = COLORS.POD_NORMAL;
        ctx.beginPath();
        ctx.roundRect(rectX, rectY, rectSize, rectSize, 8);
        ctx.fill();
        ctx.strokeStyle = COLORS.POD_BORDER;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Pod Label (Top Left)
      ctx.fillStyle = COLORS.TEXT_WHITE;
      ctx.textAlign = "left";
      ctx.font = "bold 20px Arial"; // Big label
      ctx.fillText(`P${pid}`, cx + 8, cy + 24);

      // Inventory Preview (Larger text, more lines)
      const inv = sim.state.warehouse[pid] || {};
      let yOffset = 45;
      let count = 0;
      for (const [item, qty] of Object.entries(inv)) {
        if (count >= 3) { // Show up to 3 items
          ctx.fillStyle = "#cccccc";
          ctx.font = "bold 12px Arial";
          ctx.fillText("...", cx + 8, cy + yOffset - 3);
          break;
        }
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "bold 13px Arial";
        ctx.fillText(`${item}:${qty}`, cx + 8, cy + yOffset);
        yOffset += 15;
        count++;
      }
    });

    // Draw Robot
    const rx = sim.pixelPos.x;
    const ry = sim.pixelPos.y;
    ctx.fillStyle = COLORS.ROBOT;
    ctx.beginPath();
    // Larger robot circle
    ctx.arc(rx + GRID_SIZE/2, ry + GRID_SIZE/2, 20, 0, 2 * Math.PI);
    ctx.fill();
    
    // Robot glow/stroke
    ctx.shadowColor = COLORS.ROBOT;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
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