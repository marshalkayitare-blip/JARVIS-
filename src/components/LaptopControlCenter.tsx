import React, { useState } from 'react';
import {
  Laptop,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Battery,
  BatteryCharging,
  Maximize2,
  Minimize2,
  Zap,
  Shield,
  Trash2,
  BellRing,
  AlertTriangle,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Power
} from 'lucide-react';
import type { PowerMode, BatteryTelemetry } from '../utils/laptopManager';

interface LaptopControlCenterProps {
  brightness: number;
  onBrightnessChange: (val: number) => void;
  nightLight: boolean;
  onToggleNightLight: () => void;
  volume: number;
  onVolumeChange: (val: number) => void;
  powerMode: PowerMode;
  onPowerModeChange: (mode: PowerMode) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  battery: BatteryTelemetry;
  onPurgeMemory: () => void;
  onTriggerLockdown: () => void;
  onBroadcastAlert: (title: string, message: string, severity: 'CRITICAL' | 'WARNING' | 'INFO') => void;
}

export const LaptopControlCenter: React.FC<LaptopControlCenterProps> = ({
  brightness,
  onBrightnessChange,
  nightLight,
  onToggleNightLight,
  volume,
  onVolumeChange,
  powerMode,
  onPowerModeChange,
  isFullscreen,
  onToggleFullscreen,
  battery,
  onPurgeMemory,
  onTriggerLockdown,
  onBroadcastAlert,
}) => {
  const [customAlertText, setCustomAlertText] = useState('');
  const [isPurging, setIsPurging] = useState(false);

  const handlePurge = () => {
    setIsPurging(true);
    setTimeout(() => {
      setIsPurging(false);
      onPurgeMemory();
    }, 800);
  };

  const handleCustomAlert = () => {
    if (!customAlertText.trim()) return;
    onBroadcastAlert('OPERATOR DIRECTIVE', customAlertText.trim(), 'WARNING');
    setCustomAlertText('');
  };

  return (
    <div className="w-full h-full overflow-y-auto p-3 space-y-4 font-mono-tech text-xs text-[#b8ecff]">
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between border-b border-[#00f0ff]/30 pb-2">
        <span className="font-orbitron font-bold text-sm text-[#00f0ff] flex items-center gap-2">
          <Laptop className="w-4 h-4 text-[#00f0ff]" />
          LAPTOP HARDWARE & CONTROLS
        </span>
        <span className="text-[10px] px-2 py-0.5 border border-[#00f0ff]/30 bg-[#00f0ff]/10 text-[#00f0ff] rounded">
          HOST SYNCHRONIZED
        </span>
      </div>

      {/* 1. POWER & PERFORMANCE MATRIX */}
      <div className="p-3 border border-[#00f0ff]/30 bg-[#00f0ff]/5 rounded-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-orbitron text-xs text-white font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#00f0ff]" />
            POWER MANAGEMENT PROFILE
          </span>
          <span className="text-[10px] text-[#00ffcc] font-bold">{powerMode}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            onClick={() => onPowerModeChange('OVERCLOCK')}
            className={`py-2 px-2 rounded-xs border text-center font-orbitron text-[10px] transition-all cursor-pointer ${
              powerMode === 'OVERCLOCK'
                ? 'border-[#ff0055] bg-[#ff0055]/20 text-[#ff7799] font-bold shadow-[0_0_10px_rgba(255,0,85,0.3)]'
                : 'border-gray-800 bg-black/40 text-gray-400 hover:text-white hover:border-[#00f0ff]/40'
            }`}
          >
            OVERCLOCK
          </button>
          <button
            onClick={() => onPowerModeChange('BALANCED')}
            className={`py-2 px-2 rounded-xs border text-center font-orbitron text-[10px] transition-all cursor-pointer ${
              powerMode === 'BALANCED'
                ? 'border-[#00f0ff] bg-[#00f0ff]/20 text-[#00f0ff] font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                : 'border-gray-800 bg-black/40 text-gray-400 hover:text-white hover:border-[#00f0ff]/40'
            }`}
          >
            BALANCED
          </button>
          <button
            onClick={() => onPowerModeChange('STEALTH')}
            className={`py-2 px-2 rounded-xs border text-center font-orbitron text-[10px] transition-all cursor-pointer ${
              powerMode === 'STEALTH'
                ? 'border-[#00ffcc] bg-[#00ffcc]/20 text-[#00ffcc] font-bold shadow-[0_0_10px_rgba(0,255,204,0.3)]'
                : 'border-gray-800 bg-black/40 text-gray-400 hover:text-white hover:border-[#00f0ff]/40'
            }`}
          >
            STEALTH ECO
          </button>
        </div>
      </div>

      {/* 2. BATTERY & POWER HARVESTING */}
      <div className="p-3 border border-[#00f0ff]/30 bg-[#00f0ff]/5 rounded-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-orbitron text-xs text-white font-bold flex items-center gap-1.5">
            {battery.charging ? (
              <BatteryCharging className="w-3.5 h-3.5 text-[#00ffcc] animate-pulse" />
            ) : (
              <Battery className="w-3.5 h-3.5 text-[#00f0ff]" />
            )}
            BATTERY TELEMETRY
          </span>
          <span className={`text-xs font-bold ${battery.level < 25 ? 'text-red-400' : 'text-[#00ffcc]'}`}>
            {battery.level}% {battery.charging ? '(CHARGING)' : '(ON BATTERY)'}
          </span>
        </div>

        {/* Battery Bar */}
        <div className="w-full h-3 bg-black/60 rounded-xs border border-[#00f0ff]/30 p-0.5 overflow-hidden">
          <div
            className={`h-full rounded-xs transition-all duration-500 ${
              battery.level < 20
                ? 'bg-red-500 shadow-[0_0_10px_red]'
                : battery.level < 50
                ? 'bg-amber-400'
                : 'bg-[#00ffcc] shadow-[0_0_10px_#00ffcc]'
            }`}
            style={{ width: `${battery.level}%` }}
          />
        </div>

        <div className="flex justify-between text-[10px] text-gray-400">
          <span>POWER SOURCE: {battery.charging ? 'AC ADAPTER 90W' : 'INTERNAL LITHIUM'}</span>
          <span>EST. RUNTIME: {battery.charging ? 'PLUGGED IN' : `${Math.round(battery.level * 3.8)} MINS`}</span>
        </div>
      </div>

      {/* 3. DISPLAY & SCREEN CONTROLS */}
      <div className="p-3 border border-[#00f0ff]/30 bg-[#00f0ff]/5 rounded-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-orbitron text-xs text-white font-bold flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-[#00f0ff]" />
            DISPLAY & BRIGHTNESS
          </span>
          <span className="text-xs text-[#00f0ff] font-bold">{brightness}%</span>
        </div>

        {/* Brightness Slider */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">MIN</span>
          <input
            type="range"
            min="30"
            max="120"
            value={brightness}
            onChange={(e) => onBrightnessChange(Number(e.target.value))}
            className="flex-1 accent-[#00f0ff] cursor-pointer"
          />
          <span className="text-[10px] text-gray-400">MAX</span>
        </div>

        <div className="flex items-center justify-between pt-1 gap-2">
          {/* Night Light Filter Toggle */}
          <button
            onClick={onToggleNightLight}
            className={`flex-1 py-1.5 px-2 rounded border text-center text-[10px] font-orbitron transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              nightLight
                ? 'border-amber-400 bg-amber-500/20 text-amber-300 font-bold'
                : 'border-[#00f0ff]/30 bg-black/40 text-gray-400 hover:text-white'
            }`}
          >
            <Moon className="w-3 h-3" />
            <span>NIGHT FILTER: {nightLight ? 'ACTIVE' : 'OFF'}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={onToggleFullscreen}
            className="flex-1 py-1.5 px-2 rounded border border-[#00f0ff]/30 bg-black/40 hover:bg-[#00f0ff]/15 text-gray-300 hover:text-[#00f0ff] text-center text-[10px] font-orbitron transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            <span>{isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN HUD'}</span>
          </button>
        </div>
      </div>

      {/* 4. MASTER AUDIO & VOLUME */}
      <div className="p-3 border border-[#00f0ff]/30 bg-[#00f0ff]/5 rounded-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-orbitron text-xs text-white font-bold flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-[#00f0ff]" />
            AUDIO MASTER VOLUME
          </span>
          <span className="text-xs text-[#00f0ff] font-bold">{volume}%</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">0%</span>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="flex-1 accent-[#00f0ff] cursor-pointer"
          />
          <span className="text-[10px] text-gray-400">100%</span>
        </div>
      </div>

      {/* 5. SYSTEM MAINTENANCE & SECURITY LOCKDOWN */}
      <div className="p-3 border border-[#00f0ff]/30 bg-[#00f0ff]/5 rounded-sm space-y-2">
        <span className="font-orbitron text-xs text-white font-bold flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-[#00f0ff]" />
          MAINTENANCE & SECURITY OVERRIDES
        </span>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handlePurge}
            disabled={isPurging}
            className="py-2 px-2 rounded border border-[#00f0ff]/40 bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] text-center text-[10px] font-orbitron transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 className={`w-3 h-3 ${isPurging ? 'animate-spin' : ''}`} />
            <span>{isPurging ? 'PURGING...' : 'PURGE RAM / CACHE'}</span>
          </button>

          <button
            onClick={onTriggerLockdown}
            className="py-2 px-2 rounded border border-[#ff0055]/50 bg-[#ff0055]/15 hover:bg-[#ff0055]/25 text-[#ff7799] text-center text-[10px] font-orbitron font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(255,0,85,0.2)]"
          >
            <Shield className="w-3 h-3 text-[#ff0055]" />
            <span>LOCKDOWN LAPTOP</span>
          </button>
        </div>
      </div>

      {/* 6. ANNOUNCE TACTICAL ALERTS */}
      <div className="p-3 border border-[#00f0ff]/30 bg-[#00f0ff]/5 rounded-sm space-y-2">
        <span className="font-orbitron text-xs text-white font-bold flex items-center gap-1.5">
          <BellRing className="w-3.5 h-3.5 text-[#00f0ff]" />
          ANNOUNCE TACTICAL ALERTS
        </span>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onBroadcastAlert('BATTERY WARNING', 'Laptop battery level is low. Please connect the power adapter.', 'WARNING')}
            className="p-1.5 rounded border border-amber-500/40 bg-amber-950/20 hover:bg-amber-900/40 text-amber-300 text-left text-[10px] transition-colors"
          >
            [!] BATTERY CRITICAL
          </button>
          <button
            onClick={() => onBroadcastAlert('THERMAL SPIKE', 'Thermal core temperatures elevated to eighty-four degrees. Fans at maximum.', 'CRITICAL')}
            className="p-1.5 rounded border border-red-500/40 bg-red-950/20 hover:bg-red-900/40 text-red-300 text-left text-[10px] transition-colors"
          >
            [!] THERMAL OVERHEAT
          </button>
          <button
            onClick={() => onBroadcastAlert('SECURITY BREACH', 'Perimeter firewall anomaly detected. Security protocols engaged.', 'CRITICAL')}
            className="p-1.5 rounded border border-[#ff0055]/40 bg-[#ff0055]/10 hover:bg-[#ff0055]/20 text-[#ff99bb] text-left text-[10px] transition-colors"
          >
            [!] SECURITY BREACH
          </button>
          <button
            onClick={() => onBroadcastAlert('SYSTEM NOMINAL', 'All laptop subsystems and quantum relays are running optimally.', 'INFO')}
            className="p-1.5 rounded border border-[#00ffcc]/40 bg-[#00ffcc]/10 hover:bg-[#00ffcc]/20 text-[#00ffcc] text-left text-[10px] transition-colors"
          >
            [✓] ALL SYSTEMS NOMINAL
          </button>
        </div>

        {/* Custom Alert Announcement Input */}
        <div className="flex gap-1.5 pt-1">
          <input
            type="text"
            placeholder="Type custom alert to vocalize..."
            value={customAlertText}
            onChange={(e) => setCustomAlertText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomAlert()}
            className="flex-1 bg-black/60 border border-[#00f0ff]/30 rounded px-2 py-1 text-[11px] text-[#00f0ff] placeholder-[#00f0ff]/30 focus:outline-none focus:border-[#00f0ff]"
          />
          <button
            onClick={handleCustomAlert}
            disabled={!customAlertText.trim()}
            className="px-3 py-1 bg-[#00f0ff] hover:bg-[#00d0ee] text-black font-orbitron font-bold text-[10px] rounded disabled:opacity-40 cursor-pointer"
          >
            BROADCAST
          </button>
        </div>
      </div>

    </div>
  );
};
