import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';

// Robust world map path (simplified but high-fidelity Eurasia focus)
const EURASIA_PATH =
  'M180,150 Q220,120 280,130 T400,160 Q450,140 500,120 T650,110 Q750,100 850,150 T950,220 L950,350 Q900,380 800,360 T650,320 Q550,300 450,330 T250,350 Q150,320 100,280 T150,200 Z';

const HUD_CORNER = (className: string) => (
  <div className={`absolute w-8 h-8 border-primary-500/40 pointer-events-none ${className}`} />
);

const PortNode = ({ x, y, label, _data, code }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="cursor-none"
    >
      {/* Port Signal Pulse */}
      <motion.circle
        cx={x}
        cy={y}
        r="18"
        stroke="#2563eb"
        strokeWidth="0.5"
        strokeOpacity="0.2"
        fill="none"
        animate={{ scale: [1, 2, 1], opacity: [0.2, 0, 0.2] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <circle cx={x} cy={y} r="3" fill="#2563eb" className="shadow-[0_0_15px_rgba(37,99,235,1)]" />

      {/* Label & Coordinates */}
      <text
        x={x + 15}
        y={y - 5}
        className="text-[10px] font-black uppercase tracking-tighter fill-white drop-shadow-md"
      >
        {label}
      </text>
      <text
        x={x + 15}
        y={y + 8}
        className="text-[7px] font-bold uppercase tracking-widest fill-neutral-500"
      >
        {code} | 31.23°N
      </text>

      {/* Advanced HUD Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.g
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
          >
            <rect
              x={x + 12}
              y={y - 80}
              width="160"
              height="70"
              rx="2"
              fill="black"
              fillOpacity="0.95"
              stroke="#2563eb"
              strokeWidth="1"
              strokeOpacity="0.3"
            />
            <path
              d={`M${x},${y} L${x + 12},${y - 10}`}
              stroke="#2563eb"
              strokeWidth="0.5"
              strokeDasharray="2 2"
            />

            <text
              x={x + 22}
              y={y - 62}
              className="text-[9px] font-black fill-primary-500 uppercase tracking-widest"
            >
              LIVE VESSEL FEED
            </text>
            <rect x={x + 22} y={y - 55} width="140" height="0.5" fill="white" fillOpacity="0.1" />

            <text x={x + 22} y={y - 42} className="text-[8px] font-bold fill-neutral-300 uppercase">
              LOAD FACTOR: 94%
            </text>
            <text x={x + 22} y={y - 30} className="text-[8px] font-bold fill-neutral-300 uppercase">
              TRANSIT: 21 DAYS
            </text>
            <text
              x={x + 22}
              y={y - 18}
              className="text-[8px] font-bold fill-neutral-500 uppercase italic"
            >
              Vessel: PROMO-MAERSK VI
            </text>

            <motion.rect
              x={x + 140}
              y={y - 65}
              width="20"
              height="3"
              fill="#2563eb"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
          </motion.g>
        )}
      </AnimatePresence>
    </g>
  );
};

const VesselTracker = ({
  path,
  delay,
  vesselName,
}: {
  path: string;
  delay: number;
  vesselName: string;
}) => (
  <motion.g
    initial={{ offsetDistance: '0%', opacity: 0 }}
    animate={{
      offsetDistance: '100%',
      opacity: [0, 1, 1, 0],
    }}
    transition={{
      duration: 15,
      repeat: Infinity,
      delay: delay,
      ease: 'linear',
    }}
    style={{ offsetPath: `path("${path}")` }}
  >
    <circle r="2" fill="#60a5fa" />
    <motion.circle
      r="6"
      stroke="#60a5fa"
      strokeWidth="0.5"
      animate={{ r: [6, 12], opacity: [0.5, 0] }}
      transition={{ repeat: Infinity, duration: 2 }}
    />
    <text
      y="-10"
      className="text-[6px] font-black fill-primary-500 uppercase tracking-widest pointer-events-none"
    >
      {vesselName}
    </text>
  </motion.g>
);

export const LogisticsMap = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Parallax Logic
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { damping: 20, stiffness: 100 });
  const springY = useSpring(mouseY, { damping: 20, stiffness: 100 });

  const rotateX = useTransform(springY, [-0.5, 0.5], [5, -5]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-5, 5]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const routes = [
    'M750,350 Q600,280 450,350 T200,250', // Shanghai Main
    'M820,280 Q650,220 500,280 T180,220', // Ningbo Express
    'M700,400 Q550,420 400,380 T150,250', // Shenzhen Direct
    'M750,350 Q600,400 300,380 T150,250', // Alternative Southern
  ];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full aspect-[21/9] bg-[#020305] rounded-[2rem] border border-white/10 overflow-hidden group perspective-1000 cursor-none"
    >
      <motion.div
        style={{ rotateX, rotateY, scale: 1.05 }}
        className="w-full h-full p-4 lg:p-12 relative"
      >
        {/* Background Grids & FX */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />
          <div className="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-primary-500/50 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(#2563eb10_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.2)_50%)] [background-size:100%_4px]" />
        </div>

        {/* HUD Corners */}
        {HUD_CORNER('top-4 left-4 border-t-2 border-l-2')}
        {HUD_CORNER('top-4 right-4 border-r-2 border-t-2')}
        {HUD_CORNER('bottom-4 left-4 border-l-2 border-b-2')}
        {HUD_CORNER('bottom-4 right-4 border-r-2 border-b-2')}

        <svg
          className="w-full h-full relative z-10"
          viewBox="0 0 1000 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Detailed Coordinate Grid */}
          <defs>
            <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path
                d="M 100 0 L 0 0 0 100"
                fill="none"
                stroke="white"
                strokeOpacity="0.03"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="1000" height="500" fill="url(#grid)" />

          {/* Continent Point-Cloud (Pseudo-3D effect) */}
          <motion.path
            d={EURASIA_PATH}
            fill="url(#mapGrad)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            className="drop-shadow-[0_0_20px_rgba(37,99,235,0.2)]"
          />
          <defs>
            <linearGradient id="mapGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Lat/Long Labels */}
          <text
            x="50"
            y="20"
            className="text-[6px] fill-neutral-600 font-black tracking-widest uppercase"
          >
            COORD: 44.4268° N, 26.1025° E
          </text>
          <text
            x="900"
            y="480"
            className="text-[6px] fill-neutral-600 font-black tracking-widest uppercase align-right"
          >
            SYS_CLOCK: 12:55:03_UTC
          </text>

          {/* Animated Trade Paths */}
          {routes.map((path, i) => (
            <React.Fragment key={i}>
              <path
                d={path}
                stroke="#2563eb"
                strokeWidth="0.5"
                strokeOpacity="0.1"
                fill="none"
                strokeDasharray="5 5"
              />
              <VesselTracker path={path} delay={i * 3.5} vesselName={`VESSEL_${1024 + i}`} />
              <VesselTracker path={path} delay={i * 3.5 + 7} vesselName={`CARGO_${204 + i}`} />
            </React.Fragment>
          ))}

          {/* Global Pulse Ripples */}
          <motion.circle
            cx="750"
            cy="350"
            r="10"
            stroke="#2563eb"
            strokeWidth="0.5"
            animate={{ r: [10, 300], opacity: [0.5, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
          />

          {/* Port Nodes */}
          <PortNode x={750} y={350} label="Shanghai" code="PVG" />
          <PortNode x={820} y={280} label="Ningbo" code="NGB" />
          <PortNode x={700} y={400} label="Shenzhen" code="SZX" />
          <PortNode x={200} y={250} label="Constanța" code="CND" />
          <PortNode x={180} y={220} label="Odesa" code="ODS" />
          <PortNode x={150} y={250} label="București" code="OTP" />
        </svg>

        {/* HUD DATA PANELS */}
        <div className="absolute top-8 left-8 w-48 p-4 bg-black/80 border-l border-primary-500/50 backdrop-blur-md">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[8px] font-black text-white uppercase tracking-widest">
              Global Status
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          </div>
          <div className="space-y-4">
            {[
              { label: 'Active Vessels', val: '142' },
              { label: 'Avg Transit', val: '22 d' },
              { label: 'Network Load', val: '86.4%' },
            ].map((item, i) => (
              <div key={i}>
                <div className="text-[6px] text-neutral-500 uppercase tracking-widest leading-none mb-1">
                  {item.label}
                </div>
                <div className="text-xs font-black text-white tracking-tighter">{item.val}</div>
                <div className="h-0.5 w-full bg-white/5 mt-1 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.random() * 60 + 40}%` }}
                    className="h-full bg-primary-600"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 right-8 w-64 p-4 bg-black/80 border-r border-primary-500/50 backdrop-blur-md">
          <div className="text-[7px] text-primary-500 font-black mb-3 uppercase tracking-[0.3em]">
            Neural Route Optimizer v2
          </div>
          <div className="text-[6px] text-neutral-500 font-sans leading-relaxed uppercase">
            {'>>'} CALCULATING OPTIMAL PATHS FOR Q2_2026
            <br />
            {'>>'} WEATHER_ANOMALY DETECTED IN SOUTH CHINA SEA
            <br />
            {'>>'} RE-ROUTING 4 VESSELS THROUGH MALACCA_STRAIT
            <br />
            {'>>'} LATENCY: 12ms | SYNC: STABLE
          </div>
        </div>

        {/* Progress Bar (Global) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-white/5 overflow-hidden">
          <motion.div
            className="h-full bg-primary-500 shadow-[0_0_10px_rgba(37,99,235,1)]"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </motion.div>
    </div>
  );
};
