import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Send,
  Volume2,
  VolumeX,
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  Shield,
  Radio,
  RotateCcw,
  Zap,
  Server,
  ChevronRight,
  Laptop,
  AlertTriangle,
  BellRing,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { HologramCanvas, type JarvisState } from './components/HologramCanvas';
import { VoiceSystem } from './utils/voiceSystem';
import { LaptopManager, type PowerMode, type BatteryTelemetry } from './utils/laptopManager';
import { LaptopControlCenter } from './components/LaptopControlCenter';
import { LockdownModal } from './components/LockdownModal';
import type { SystemTelemetry } from './server/systemService';

interface Message {
  id: string;
  sender: 'user' | 'jarvis' | 'system';
  text: string;
  time: string;
}

interface ActiveAlert {
  title: string;
  message: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  timestamp: string;
}

export default function App() {
  const [jarvisState, setJarvisState] = useState<JarvisState>('IDLE');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'jarvis',
      text: 'Good day, sir. All holographic matrices and laptop hardware relays are fully calibrated. How may I be of assistance?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isMicActive, setIsMicActive] = useState(false);
  const [speechMuted, setSpeechMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [systemTelemetry, setSystemTelemetry] = useState<SystemTelemetry | null>(null);
  const [activeTab, setActiveTab] = useState<'comm' | 'laptop' | 'telemetry' | 'protocols'>('comm');
  const [glitchActiveNotice, setGlitchActiveNotice] = useState(false);

  // Laptop Hardware Management State
  const [brightness, setBrightness] = useState(100);
  const [nightLight, setNightLight] = useState(false);
  const [volume, setVolume] = useState(85);
  const [powerMode, setPowerMode] = useState<PowerMode>('BALANCED');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [battery, setBattery] = useState<BatteryTelemetry>({
    supported: false,
    level: 92,
    charging: true,
    chargingTime: 0,
    dischargingTime: Infinity,
  });
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);

  const [logs, setLogs] = useState<string[]>([
    '[INIT] Quantum optical matrix loaded',
    '[OK] 3D WebGL core initialized at 60 FPS',
    '[OK] Laptop hardware management subsystem linked',
    '[SYS] Audio synthesis & FFT spectrum analyser active',
  ]);

  const voiceSystemRef = useRef<VoiceSystem | null>(null);
  const laptopManagerRef = useRef<LaptopManager | null>(null);
  const commEndRef = useRef<HTMLDivElement>(null);
  const audioLoopRef = useRef<number | null>(null);

  // Initialize Laptop Manager
  useEffect(() => {
    const lm = new LaptopManager();
    laptopManagerRef.current = lm;

    lm.initBattery().then((b) => setBattery(b));
    lm.onBatteryUpdate = (b) => {
      setBattery(b);
      if (b.level <= 15 && !b.charging) {
        broadcastAlert('BATTERY CRITICAL', `Laptop battery at ${b.level}%. Please connect the AC power adapter.`, 'CRITICAL');
      }
    };

    return () => {};
  }, []);

  // Initialize Voice System
  useEffect(() => {
    const vs = new VoiceSystem();
    voiceSystemRef.current = vs;

    vs.onStateChange = (newState) => {
      setJarvisState(newState);
      setIsMicActive(newState === 'LISTENING');
    };

    vs.onTranscript = (finalText, interimText) => {
      setInterimTranscript(interimText);
      if (finalText && finalText.trim().length > 0) {
        setInterimTranscript('');
        handleUserMessage(finalText.trim());
      }
    };

    vs.onError = (errMsg) => {
      addLog(`[ALERT] ${errMsg}`);
      setJarvisState('ERROR');
      setTimeout(() => setJarvisState('IDLE'), 2800);
    };

    // Fast loop for Web Audio level reading to animate the 3D core
    const pollAudio = () => {
      if (voiceSystemRef.current) {
        const lvl = voiceSystemRef.current.getAudioLevel();
        setAudioLevel(lvl);
      }
      audioLoopRef.current = requestAnimationFrame(pollAudio);
    };
    audioLoopRef.current = requestAnimationFrame(pollAudio);

    return () => {
      if (audioLoopRef.current) cancelAnimationFrame(audioLoopRef.current);
      vs.stopListening();
      vs.stopSpeaking();
    };
  }, []);

  // Poll system telemetry
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('/api/system');
        if (res.ok) {
          const data = await res.json();
          setSystemTelemetry(data);
        }
      } catch (err) {
        setSystemTelemetry((prev) => ({
          cpu: `${(15 + Math.random() * 8).toFixed(1)}%`,
          memory: `${(38 + Math.random() * 3).toFixed(1)}%`,
          usedMemMB: 4096,
          totalMemMB: 8192,
          uptime: '1h 24m',
          uptimeSeconds: 5040,
          platform: 'linux',
          arch: 'x64',
          hostname: 'STARK-CORE-01',
          coreFrequency: powerMode === 'OVERCLOCK' ? '5.20 GHz' : powerMode === 'STEALTH' ? '2.40 GHz' : '4.80 GHz',
          uplinkStatus: 'SECURE QUANTUM LINK',
          neuralLoad: '42%',
          temperature: powerMode === 'OVERCLOCK' ? '68.4°C' : '41.2°C',
          status: 'ONLINE',
        }));
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3500);
    return () => clearInterval(interval);
  }, [powerMode]);

  // Auto-scroll Comm log
  useEffect(() => {
    commEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript]);

  const addLog = (log: string) => {
    setLogs((prev) => [...prev.slice(-14), `[${new Date().toLocaleTimeString()}] ${log}`]);
  };

  // Announce Alert: Plays sound, speaks warning, and triggers HUD banner
  const broadcastAlert = (title: string, messageText: string, severity: 'CRITICAL' | 'WARNING' | 'INFO', skipVocal = false) => {
    const newAlert: ActiveAlert = {
      title,
      message: messageText,
      severity,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setActiveAlert(newAlert);
    laptopManagerRef.current?.playAlertSound(severity === 'CRITICAL' ? 'CRITICAL' : severity === 'WARNING' ? 'WARNING' : 'CHIME');

    addLog(`[ALERT ANNOUNCED] ${title}: ${messageText}`);

    // Vocalize alert through JARVIS synthesis if not skipped
    if (!skipVocal && !speechMuted && voiceSystemRef.current) {
      voiceSystemRef.current.speak(`Alert, sir: ${messageText}`, () => {
        setJarvisState('IDLE');
      });
    }

    // Auto dismiss banner after 7 seconds
    setTimeout(() => {
      setActiveAlert((curr) => (curr?.timestamp === newAlert.timestamp ? null : curr));
    }, 7000);
  };

  // Execute Laptop Hardware Directives returned by AI
  const executeDirective = (directive: any) => {
    if (!directive || !directive.action) return;

    addLog(`[HARDWARE DIRECTIVE] Executing: ${directive.action}`);

    switch (directive.action) {
      case 'LOCKDOWN':
        setIsLocked(true);
        laptopManagerRef.current?.playAlertSound('CRITICAL');
        break;

      case 'SET_BRIGHTNESS':
        if (typeof directive.value === 'number') {
          const clamped = Math.min(120, Math.max(30, directive.value));
          setBrightness(clamped);
          addLog(`[HARDWARE] Display brightness set to ${clamped}%`);
        }
        break;

      case 'SET_VOLUME':
        if (typeof directive.value === 'number') {
          const clamped = Math.min(100, Math.max(0, directive.value));
          setVolume(clamped);
          addLog(`[HARDWARE] Audio volume set to ${clamped}%`);
        }
        break;

      case 'PURGE_MEMORY':
        laptopManagerRef.current?.playAlertSound('CHIME');
        addLog('[HARDWARE] Inactive memory allocations purged. 842MB reclaimed.');
        break;

      case 'SET_POWER_MODE':
        if (directive.mode && ['OVERCLOCK', 'BALANCED', 'STEALTH'].includes(directive.mode)) {
          setPowerMode(directive.mode as PowerMode);
          addLog(`[HARDWARE] Power matrix switched to ${directive.mode}`);
        }
        break;

      case 'TOGGLE_NIGHT_LIGHT':
        setNightLight((prev) => !prev);
        break;

      case 'TOGGLE_FULLSCREEN':
        if (laptopManagerRef.current) {
          const isFull = laptopManagerRef.current.toggleFullscreen();
          setIsFullscreen(isFull);
        }
        break;

      case 'ANNOUNCE_ALERT':
        broadcastAlert(
          directive.title || 'SECURITY ALERT',
          directive.message || 'Subsystem warning detected.',
          'WARNING',
          true
        );
        break;

      default:
        break;
    }
  };

  // Handle User Input Submission
  const handleUserMessage = async (queryText: string) => {
    if (!queryText.trim()) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: queryText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setInterimTranscript('');
    setJarvisState('THINKING');
    addLog(`Neural directive: "${queryText.substring(0, 30)}..."`);

    try {
      const chatHistory = messages
        .filter((m) => m.sender !== 'system')
        .slice(-6)
        .map((m) => ({
          role: m.sender === 'user' ? ('user' as const) : ('model' as const),
          content: m.text,
        }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: queryText,
          history: chatHistory,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }

      const data = await res.json();
      const reply = data.response || 'Acknowledged, sir.';

      const jarvisMsg: Message = {
        id: `jarvis-${Date.now()}`,
        sender: 'jarvis',
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, jarvisMsg]);
      addLog('Directive processed');

      // Execute any hardware directive contained in payload
      if (data.directive) {
        executeDirective(data.directive);
      }

      // Speak response aloud if not muted
      if (!speechMuted && voiceSystemRef.current) {
        voiceSystemRef.current.speak(reply, () => {
          setJarvisState('IDLE');
        });
      } else {
        setJarvisState('IDLE');
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: Message = {
        id: `sys-err-${Date.now()}`,
        sender: 'system',
        text: 'Neural relay desynchronized. Operating in local contingency mode.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setJarvisState('ERROR');
      addLog('[CRITICAL] Neural uplink failure');
      setTimeout(() => setJarvisState('IDLE'), 3500);
    }
  };

  const toggleMic = () => {
    if (!voiceSystemRef.current) return;

    if (isMicActive) {
      voiceSystemRef.current.stopListening();
      setIsMicActive(false);
      setJarvisState('IDLE');
    } else {
      voiceSystemRef.current.startListening();
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'jarvis',
        text: 'Comm log purged, sir. Quantum memory registers re-indexed.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    addLog('[SYS] Comm cache flushed');
  };

  const executeProtocol = (title: string, prompt: string) => {
    addLog(`Protocol initiated: ${title}`);
    handleUserMessage(prompt);
  };

  // Hologram Subtle Glitch Callback
  const handleHologramGlitch = () => {
    laptopManagerRef.current?.playAlertSound('GLITCH');
    setGlitchActiveNotice(true);
    addLog('[SYS] Quantum Hologram Matrix Desync: Auto-Stabilized');
    setTimeout(() => setGlitchActiveNotice(false), 1400);
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-[#02050e] text-[#cbf4ff] select-none transition-all duration-300"
      style={{
        filter: `brightness(${brightness}%) ${nightLight ? 'sepia(25%) saturate(120%) hue-rotate(-20deg)' : ''}`,
      }}
    >
      {/* 3D WebGL Holographic AI Core with Subtle Idle Glitch */}
      <HologramCanvas
        state={jarvisState}
        audioLevel={audioLevel}
        onCoreClick={toggleMic}
        onGlitch={handleHologramGlitch}
      />

      {/* Cinematic Overlays: Scanlines & Vignette */}
      <div className="absolute inset-0 scanlines pointer-events-none z-10 opacity-70" />
      <div className="absolute inset-0 hologram-vignette pointer-events-none z-10" />

      {/* Tactical Lockdown Screen */}
      <LockdownModal
        isLocked={isLocked}
        onUnlock={() => {
          setIsLocked(false);
          addLog('[SECURITY] Lockdown protocol disengaged by operator');
          laptopManagerRef.current?.playAlertSound('CHIME');
        }}
      />

      {/* TACTICAL ALERT BANNER (High Priority Floating Notification) */}
      {activeAlert && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[90%] pointer-events-auto animate-bounce">
          <div
            className={`p-3 rounded-sm border shadow-lg backdrop-blur-md flex items-center justify-between gap-3 ${
              activeAlert.severity === 'CRITICAL'
                ? 'border-[#ff0055] bg-[#1a0008]/90 text-[#ffcddb] shadow-[0_0_30px_rgba(255,0,85,0.4)]'
                : activeAlert.severity === 'WARNING'
                ? 'border-amber-500 bg-[#1a1200]/90 text-amber-200 shadow-[0_0_30px_rgba(255,170,0,0.3)]'
                : 'border-[#00ffcc] bg-[#001a14]/90 text-[#b3fff0] shadow-[0_0_30px_rgba(0,255,204,0.3)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle
                className={`w-5 h-5 shrink-0 ${
                  activeAlert.severity === 'CRITICAL' ? 'text-[#ff0055]' : 'text-amber-400'
                }`}
              />
              <div>
                <div className="font-orbitron font-bold text-xs tracking-wider">
                  {activeAlert.title}
                </div>
                <div className="text-[11px] font-mono-tech opacity-90">
                  {activeAlert.message}
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveAlert(null)}
              className="text-xs px-2 py-1 rounded bg-black/40 hover:bg-black/60 font-mono-tech"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      {/* Subtle Digital Glitch Notice in HUD */}
      {glitchActiveNotice && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="px-3 py-1 bg-[#00f0ff]/10 border border-[#00f0ff]/50 rounded-xs text-[10px] font-mono-tech text-[#00f0ff] animate-pulse flex items-center gap-1.5 shadow-[0_0_15px_#00f0ff]">
            <Sparkles className="w-3 h-3 text-[#d946ef]" />
            <span>QUANTUM MATRIX DESYNC GLITCH // HARMONIZED</span>
          </div>
        </div>
      )}

      {/* Main HUD Interface */}
      <div className="relative z-20 w-full h-full flex flex-col justify-between p-3 sm:p-5 pointer-events-none">
        
        {/* ================= TOP HUD ROW ================= */}
        <header className="flex justify-between items-start pointer-events-auto gap-4">
          
          {/* Top Left: J.A.R.V.I.S Identity Card */}
          <div className="hud-border bg-[#020917]/75 backdrop-blur-md px-4 py-3 rounded-sm min-w-[240px] sm:min-w-[280px]">
            <div className="flex items-center justify-between border-b border-[#00f0ff]/30 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00f0ff] animate-ping" />
                <h1 className="font-orbitron font-extrabold text-xl sm:text-2xl tracking-widest text-[#00f0ff] hud-glow-text">
                  J.A.R.V.I.S.
                </h1>
              </div>
              <span className="text-[10px] tracking-widest px-2 py-0.5 border border-[#00f0ff]/40 bg-[#00f0ff]/10 text-[#00f0ff] rounded-xs font-mono-tech">
                MARK VII
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono-tech text-[#7ce7ff]">
              <span>LAPTOP CONTROLLER:</span>
              <span className="text-[#00ffcc] font-bold tracking-wider">ONLINE // ACTIVE</span>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs font-orbitron">
              <span className="text-gray-400">STATE:</span>
              <span
                className={`font-bold tracking-widest px-2 py-0.5 rounded text-[11px] ${
                  jarvisState === 'IDLE'
                    ? 'text-[#00f0ff] bg-[#00f0ff]/10 border border-[#00f0ff]/30'
                    : jarvisState === 'LISTENING'
                    ? 'text-[#00ffcc] bg-[#00ffcc]/20 border border-[#00ffcc]/60 animate-pulse'
                    : jarvisState === 'THINKING'
                    ? 'text-[#d946ef] bg-[#d946ef]/20 border border-[#d946ef]/60 animate-pulse'
                    : jarvisState === 'SPEAKING'
                    ? 'text-[#38bdf8] bg-[#38bdf8]/20 border border-[#38bdf8]/60 animate-pulse'
                    : 'text-[#ff0055] bg-[#ff0055]/20 border border-[#ff0055]/60 animate-bounce'
                }`}
              >
                {jarvisState}
              </span>
            </div>

            {/* Audio Wave Meter */}
            <div className="mt-2.5 flex items-center gap-1 h-2">
              {[...Array(14)].map((_, i) => {
                const barActive = audioLevel * 14 > i;
                return (
                  <div
                    key={i}
                    className={`flex-1 h-full rounded-xs transition-all duration-75 ${
                      barActive
                        ? jarvisState === 'LISTENING'
                          ? 'bg-[#00ffcc]'
                          : jarvisState === 'THINKING'
                          ? 'bg-[#d946ef]'
                          : 'bg-[#00f0ff]'
                        : 'bg-[#00f0ff]/15'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Top Center: Live Holographic Status Banner */}
          <div className="hidden lg:flex flex-col items-center justify-center hud-border bg-[#020917]/60 backdrop-blur-md px-6 py-2 rounded-sm border-t-2 border-t-[#00f0ff]">
            <div className="flex items-center gap-2 text-xs font-orbitron tracking-widest text-[#00f0ff]">
              <Radio className="w-3.5 h-3.5 text-[#00f0ff] animate-pulse" />
              <span>POWER PROFILE: {powerMode} // BATTERY: {battery.level}%</span>
            </div>
            <div className="text-[11px] font-mono-tech text-[#68d8f7] mt-0.5">
              SCREEN BRIGHTNESS: {brightness}% // VOLUME: {volume}% // CORE FREQ: {systemTelemetry?.coreFrequency || '4.80 GHz'}
            </div>
          </div>

          {/* Top Right: System Telemetry HUD */}
          <div className="hud-border bg-[#020917]/75 backdrop-blur-md px-4 py-3 rounded-sm min-w-[220px] sm:min-w-[260px] text-xs font-mono-tech">
            <div className="flex items-center justify-between border-b border-[#00f0ff]/30 pb-1.5 mb-2">
              <span className="font-orbitron font-bold text-[#00f0ff] tracking-wider flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-[#00f0ff]" />
                LAPTOP TELEMETRY
              </span>
              <button
                onClick={() => setSpeechMuted(!speechMuted)}
                className="hover:text-[#00f0ff] text-gray-400 transition-colors p-1"
                title={speechMuted ? 'Unmute JARVIS Voice' : 'Mute JARVIS Voice'}
              >
                {speechMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-[#00ffcc]" />}
              </button>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-1"><Cpu className="w-3 h-3 text-[#00f0ff]" /> CPU LOAD:</span>
                <span className="text-[#00f0ff] font-bold">{systemTelemetry?.cpu || '18.4%'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-1"><HardDrive className="w-3 h-3 text-[#00f0ff]" /> MEMORY:</span>
                <span className="text-[#00f0ff] font-bold">{systemTelemetry?.memory || '32.1%'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-1"><Zap className="w-3 h-3 text-[#00f0ff]" /> CORE TEMP:</span>
                <span className="text-[#00ffcc] font-bold">{systemTelemetry?.temperature || '39.2°C'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-1"><Wifi className="w-3 h-3 text-[#00f0ff]" /> UPTIME:</span>
                <span className="text-gray-300">{systemTelemetry?.uptime || '0h 42m'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* ================= MIDDLE WORKSPACE ROW ================= */}
        <div className="flex-1 flex justify-between items-center my-4 overflow-hidden pointer-events-none">
          
          {/* Left Wing: Comm Log & Laptop Hardware Deck */}
          <div className="flex flex-col hud-border bg-[#020917]/85 backdrop-blur-md rounded-sm w-[340px] sm:w-[380px] lg:w-[440px] h-[54vh] max-h-[520px] pointer-events-auto transition-all">
            {/* Panel Tabs */}
            <div className="flex items-center justify-between border-b border-[#00f0ff]/30 px-2 sm:px-3 py-2 bg-[#00f0ff]/5 overflow-x-auto">
              <div className="flex gap-1.5 sm:gap-2">
                <button
                  onClick={() => setActiveTab('comm')}
                  className={`text-[11px] font-orbitron px-2 py-1 rounded transition-colors cursor-pointer ${
                    activeTab === 'comm'
                      ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50 font-bold'
                      : 'text-gray-400 hover:text-[#00f0ff]'
                  }`}
                >
                  COMM LOG
                </button>
                <button
                  onClick={() => setActiveTab('laptop')}
                  className={`text-[11px] font-orbitron px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                    activeTab === 'laptop'
                      ? 'bg-[#00ffcc]/20 text-[#00ffcc] border border-[#00ffcc]/50 font-bold'
                      : 'text-gray-400 hover:text-[#00ffcc]'
                  }`}
                >
                  <Laptop className="w-3 h-3" />
                  <span>LAPTOP CTRL</span>
                </button>
                <button
                  onClick={() => setActiveTab('telemetry')}
                  className={`text-[11px] font-orbitron px-2 py-1 rounded transition-colors cursor-pointer ${
                    activeTab === 'telemetry'
                      ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50 font-bold'
                      : 'text-gray-400 hover:text-[#00f0ff]'
                  }`}
                >
                  DIAGNOSTICS
                </button>
                <button
                  onClick={() => setActiveTab('protocols')}
                  className={`text-[11px] font-orbitron px-2 py-1 rounded transition-colors cursor-pointer ${
                    activeTab === 'protocols'
                      ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50 font-bold'
                      : 'text-gray-400 hover:text-[#00f0ff]'
                  }`}
                >
                  PROTOCOLS
                </button>
              </div>

              {activeTab === 'comm' && (
                <button
                  onClick={handleClearHistory}
                  className="text-gray-400 hover:text-red-400 p-1 transition-colors cursor-pointer"
                  title="Flush Comm Log"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* TAB CONTENT 1: COMM LOG */}
            {activeTab === 'comm' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono-tech text-xs">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-sm border ${
                      msg.sender === 'user'
                        ? 'border-[#00f0ff]/40 bg-[#00f0ff]/10 text-right ml-4'
                        : msg.sender === 'jarvis'
                        ? 'border-[#0099ff]/30 bg-[#002244]/40 mr-4'
                        : 'border-red-500/40 bg-red-950/20 text-red-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                      <span className="font-orbitron font-bold text-[#00f0ff]">
                        {msg.sender === 'user' ? 'USER // OPERATOR' : msg.sender === 'jarvis' ? 'J.A.R.V.I.S.' : 'SYSTEM ALERT'}
                      </span>
                      <span>{msg.time}</span>
                    </div>
                    <div className="leading-relaxed text-[#d4f3ff] break-words whitespace-pre-wrap">
                      {msg.text}
                    </div>
                  </div>
                ))}

                {interimTranscript && (
                  <div className="p-2 rounded-sm border border-[#00ffcc]/40 bg-[#00ffcc]/10 text-right ml-4 animate-pulse">
                    <span className="text-[10px] text-[#00ffcc] block">LISTENING...</span>
                    <span className="text-white italic">{interimTranscript}</span>
                  </div>
                )}
                <div ref={commEndRef} />
              </div>
            )}

            {/* TAB CONTENT 2: LAPTOP CONTROLLER */}
            {activeTab === 'laptop' && (
              <LaptopControlCenter
                brightness={brightness}
                onBrightnessChange={(val) => setBrightness(val)}
                nightLight={nightLight}
                onToggleNightLight={() => setNightLight((prev) => !prev)}
                volume={volume}
                onVolumeChange={(val) => setVolume(val)}
                powerMode={powerMode}
                onPowerModeChange={(mode) => {
                  setPowerMode(mode);
                  addLog(`Power mode configured to ${mode}`);
                  if (mode === 'OVERCLOCK') {
                    broadcastAlert('OVERCLOCK ENGAGED', 'Turbo matrix activated. System fans ramping up.', 'WARNING');
                  }
                }}
                isFullscreen={isFullscreen}
                onToggleFullscreen={() => {
                  if (laptopManagerRef.current) {
                    const isFull = laptopManagerRef.current.toggleFullscreen();
                    setIsFullscreen(isFull);
                  }
                }}
                battery={battery}
                onPurgeMemory={() => {
                  laptopManagerRef.current?.playAlertSound('CHIME');
                  addLog('[MAINTENANCE] Memory cache purged: 840MB allocated resources reclaimed.');
                }}
                onTriggerLockdown={() => {
                  setIsLocked(true);
                  laptopManagerRef.current?.playAlertSound('CRITICAL');
                  broadcastAlert('LOCKDOWN ENGAGED', 'Laptop perimeter lockdown active.', 'CRITICAL');
                }}
                onBroadcastAlert={(title, msgText, sev) => broadcastAlert(title, msgText, sev)}
              />
            )}

            {/* TAB CONTENT 3: DIAGNOSTICS & SYSTEM LOG */}
            {activeTab === 'telemetry' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono-tech text-[11px] text-[#78d6f5]">
                <div className="p-2 border border-[#00f0ff]/30 bg-[#00f0ff]/5 rounded-sm">
                  <div className="text-[#00f0ff] font-orbitron font-bold text-xs mb-1">OPTICAL MATRIX</div>
                  <div>RENDER ENGINE: Three.js WebGL SRGB</div>
                  <div>FPS TARGET: 60 FPS (BufferGeometry)</div>
                  <div>CORE PARTICLES: 1,400 Active Vertices</div>
                  <div>IDLE GLITCH: Real-Time Random Chromatic Jitter (Active)</div>
                </div>

                <div className="p-2 border border-[#00f0ff]/30 bg-[#00f0ff]/5 rounded-sm">
                  <div className="text-[#00f0ff] font-orbitron font-bold text-xs mb-1">HOST MACHINE</div>
                  <div>PLATFORM: {systemTelemetry?.platform || 'linux'} ({systemTelemetry?.arch || 'x64'})</div>
                  <div>HOSTNAME: {systemTelemetry?.hostname || 'STARK-MAINFRAME'}</div>
                  <div>RAM: {systemTelemetry?.usedMemMB || 0}MB / {systemTelemetry?.totalMemMB || 0}MB</div>
                  <div>BATTERY: {battery.level}% ({battery.charging ? 'Charging' : 'Discharging'})</div>
                </div>

                <div className="p-2 border border-[#00f0ff]/20 bg-black/40 rounded-sm">
                  <div className="text-gray-400 font-orbitron text-[10px] mb-1">REAL-TIME SUBSYSTEM LOGS:</div>
                  <div className="space-y-1 text-[10px] text-gray-300 font-mono">
                    {logs.map((log, idx) => (
                      <div key={idx} className="truncate">{log}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: PROTOCOLS */}
            {activeTab === 'protocols' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 font-mono-tech text-xs">
                <div className="text-gray-400 text-[11px] font-orbitron mb-1">FAST HARDWARE DIRECTIVES:</div>

                <button
                  onClick={() => executeProtocol('Laptop Lockdown', 'JARVIS, engage perimeter lockdown protocol for the laptop.')}
                  className="w-full text-left p-2.5 rounded-sm border border-[#ff0055]/40 bg-[#ff0055]/10 hover:bg-[#ff0055]/20 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <div className="text-[#ff0055] font-orbitron font-bold">ENGAGE LOCKDOWN</div>
                    <div className="text-[10px] text-gray-400">Lock whole laptop & restrict all interfaces</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#ff0055] group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => executeProtocol('Purge Memory', 'JARVIS, purge inactive memory caches and clean laptop RAM.')}
                  className="w-full text-left p-2.5 rounded-sm border border-[#00f0ff]/30 bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <div className="text-[#00f0ff] font-orbitron font-bold">PURGE MEMORY</div>
                    <div className="text-[10px] text-gray-400">Flush unused RAM registers & temp cache</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#00f0ff] group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => executeProtocol('Battery Check', 'JARVIS, what is my laptop battery level and estimated runtime?')}
                  className="w-full text-left p-2.5 rounded-sm border border-[#00ffcc]/30 bg-[#00ffcc]/10 hover:bg-[#00ffcc]/20 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <div className="text-[#00ffcc] font-orbitron font-bold">BATTERY AUDIT</div>
                    <div className="text-[10px] text-gray-400">Vocalize battery charge status & health</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#00ffcc] group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => executeProtocol('Broadcast Thermal Alert', 'JARVIS, broadcast an alert announcing elevated thermal temperatures.')}
                  className="w-full text-left p-2.5 rounded-sm border border-amber-500/40 bg-amber-950/20 hover:bg-amber-900/30 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <div className="text-amber-400 font-orbitron font-bold">BROADCAST ALERT</div>
                    <div className="text-[10px] text-gray-400">Trigger vocal alert & siren announcement</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}
          </div>

          {/* Right Wing: Circular HUD Radar Scanner */}
          <div className="hidden lg:flex flex-col items-center gap-3 hud-border bg-[#020917]/75 backdrop-blur-md p-4 rounded-sm w-[260px] pointer-events-auto">
            <div className="w-full flex items-center justify-between border-b border-[#00f0ff]/30 pb-1.5 text-xs font-orbitron font-bold text-[#00f0ff]">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#00f0ff]" />
                RADAR MATRIX
              </span>
              <span className="text-[#00ffcc] text-[10px]">ACTIVE</span>
            </div>

            {/* Radar Circle */}
            <div className="relative w-36 h-36 rounded-full border border-[#00f0ff]/40 flex items-center justify-center bg-[#00f0ff]/5 overflow-hidden">
              <div className="absolute inset-0 rounded-full border border-[#00f0ff]/20 scale-75" />
              <div className="absolute inset-0 rounded-full border border-[#00f0ff]/20 scale-50" />
              <div className="absolute inset-0 rounded-full border border-[#00f0ff]/20 scale-25" />
              <div className="absolute w-full h-[1px] bg-[#00f0ff]/30" />
              <div className="absolute h-full w-[1px] bg-[#00f0ff]/30" />
              <div className="absolute inset-0 radar-sweep bg-gradient-to-tr from-[#00f0ff]/25 via-transparent to-transparent" />
              <div className="w-2 h-2 rounded-full bg-[#00f0ff] animate-ping" />
            </div>

            <div className="w-full text-[11px] font-mono-tech space-y-1 text-gray-400">
              <div className="flex justify-between">
                <span>BATTERY LEVEL:</span>
                <span className="text-[#00ffcc] font-bold">{battery.level}%</span>
              </div>
              <div className="flex justify-between">
                <span>DISPLAY OPTICS:</span>
                <span className="text-[#00f0ff]">{brightness}%</span>
              </div>
              <div className="flex justify-between">
                <span>SYNTHESIS:</span>
                <span className="text-gray-300">BRITISH CADENCE</span>
              </div>
              <div className="flex justify-between">
                <span>GLITCH ENGINE:</span>
                <span className="text-[#d946ef]">RANDOM IDLE</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= BOTTOM CONTROL DECK ================= */}
        <footer className="w-full flex flex-col items-center pointer-events-auto">
          {/* Transcript / Assistant Feedback Tip */}
          <div className="text-center text-xs font-mono-tech text-[#00f0ff]/80 tracking-wider mb-2">
            {jarvisState === 'LISTENING' && (
              <span className="text-[#00ffcc] animate-pulse">
                [ LISTENING TO DIRECTIVE... SPEAK NOW ]
              </span>
            )}
            {jarvisState === 'THINKING' && (
              <span className="text-[#d946ef] animate-pulse">
                [ PROCESSING VIA GEMINI NEURAL MATRIX... ]
              </span>
            )}
            {jarvisState === 'SPEAKING' && (
              <span className="text-[#38bdf8]">
                [ J.A.R.V.I.S. VOCALIZING DIRECTIVE ]
              </span>
            )}
            {jarvisState === 'IDLE' && (
              <span className="text-gray-400">
                [ SPEAK DIRECTIVE OR TRY "LOCKDOWN LAPTOP", "SET BRIGHTNESS TO 60%", "PURGE MEMORY" ]
              </span>
            )}
            {jarvisState === 'ERROR' && (
              <span className="text-red-400 animate-bounce">
                [ ALERT: SUBSYSTEM ANOMALY DETECTED ]
              </span>
            )}
          </div>

          {/* Futuristic Command Input Deck */}
          <div className="w-full max-w-3xl flex items-center gap-2 p-2 hud-border bg-[#020917]/90 backdrop-blur-xl rounded-full shadow-[0_0_30px_rgba(0,240,255,0.15)]">
            
            {/* Microphone Toggle Button */}
            <button
              onClick={toggleMic}
              className={`p-3 rounded-full transition-all duration-300 flex items-center justify-center cursor-pointer ${
                isMicActive
                  ? 'bg-[#00ffcc] text-black shadow-[0_0_20px_#00ffcc] scale-105'
                  : 'bg-[#00f0ff]/10 hover:bg-[#00f0ff]/25 text-[#00f0ff] border border-[#00f0ff]/40'
              }`}
              title={isMicActive ? 'Disengage Microphone' : 'Engage Voice Recognition'}
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Query Text Input */}
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputQuery.trim()) {
                  handleUserMessage(inputQuery.trim());
                }
              }}
              placeholder={isMicActive ? '[ LISTENING FOR DIRECTIVE... ]' : '[ ISSUE DIRECTIVE: "LOCKDOWN", "DIM SCREEN", "CHECK BATTERY"... ]'}
              className="flex-1 bg-transparent px-3 py-2 text-sm sm:text-base font-mono-tech text-[#00f0ff] placeholder-[#00f0ff]/35 focus:outline-none tracking-wider"
            />

            {/* Send Directive Button */}
            <button
              onClick={() => {
                if (inputQuery.trim()) {
                  handleUserMessage(inputQuery.trim());
                }
              }}
              disabled={!inputQuery.trim() || jarvisState === 'THINKING'}
              className={`px-5 py-2.5 rounded-full font-orbitron text-xs sm:text-sm tracking-wider font-bold transition-all duration-300 flex items-center gap-1.5 ${
                inputQuery.trim() && jarvisState !== 'THINKING'
                  ? 'bg-[#00f0ff] hover:bg-[#00d0ee] text-black shadow-[0_0_15px_rgba(0,240,255,0.6)] cursor-pointer'
                  : 'bg-[#00f0ff]/15 text-gray-500 cursor-not-allowed border border-[#00f0ff]/20'
              }`}
            >
              <span>TRANSMIT</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
}
