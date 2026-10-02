/**
 * Laptop Hardware & System Management Engine for J.A.R.V.I.S
 * Handles battery telemetry, display brightness, power modes, audio master,
 * Web Audio procedural alert sound effects, and security lockdown.
 */

export type PowerMode = 'OVERCLOCK' | 'BALANCED' | 'STEALTH';

export interface BatteryTelemetry {
  supported: boolean;
  level: number; // 0 to 100
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
}

export interface LaptopState {
  brightness: number; // 30 to 120
  nightLight: boolean;
  volume: number; // 0 to 100
  powerMode: PowerMode;
  isLocked: boolean;
  isFullscreen: boolean;
  battery: BatteryTelemetry;
  lastPurgedTime?: string;
  activeAlert: string | null;
}

export class LaptopManager {
  private audioCtx: AudioContext | null = null;
  private batteryManager: any = null;

  public onBatteryUpdate?: (battery: BatteryTelemetry) => void;
  public onAlertTriggered?: (title: string, message: string, severity: 'CRITICAL' | 'WARNING' | 'INFO') => void;

  constructor() {
    this.initBattery();
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Initialize Web Battery API
   */
  public async initBattery(): Promise<BatteryTelemetry> {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        this.batteryManager = battery;

        const updateBatteryState = () => {
          const telemetry: BatteryTelemetry = {
            supported: true,
            level: Math.round(battery.level * 100),
            charging: battery.charging,
            chargingTime: battery.chargingTime,
            dischargingTime: battery.dischargingTime,
          };
          this.onBatteryUpdate?.(telemetry);
        };

        battery.addEventListener('chargingchange', updateBatteryState);
        battery.addEventListener('levelchange', updateBatteryState);

        const currentTelemetry: BatteryTelemetry = {
          supported: true,
          level: Math.round(battery.level * 100),
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
        };
        return currentTelemetry;
      } catch (err) {
        console.warn('[J.A.R.V.I.S] Battery API not permitted:', err);
      }
    }

    // Default simulated battery for desktop or unsupported environments
    return {
      supported: false,
      level: 88,
      charging: true,
      chargingTime: 1800,
      dischargingTime: Infinity,
    };
  }

  /**
   * Procedural Audio Synthesizer: Tactical Alert Klaxon
   */
  public playAlertSound(type: 'CRITICAL' | 'WARNING' | 'CHIME' | 'GLITCH') {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      if (type === 'CRITICAL') {
        // High-low tactical alarm sweep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.25);
        osc.frequency.setValueAtTime(880, now + 0.3);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.55);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'WARNING') {
        // Dual beep warning tone
        [0, 0.18].forEach((delay) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(620, now + delay);
          gain.gain.setValueAtTime(0.25, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.12);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + delay);
          osc.stop(now + delay + 0.12);
        });
      } else if (type === 'GLITCH') {
        // High frequency cybernetic chirp
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1400 + Math.random() * 600, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else {
        // Nominal Stark chime (high harmonic major triad)
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);

          gain.gain.setValueAtTime(0.2, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.45);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.45);
        });
      }
    } catch (e) {
      console.warn('[J.A.R.V.I.S] Audio effect playback suppressed:', e);
    }
  }

  /**
   * Fullscreen Toggle
   */
  public toggleFullscreen(): boolean {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      return true;
    } else {
      document.exitFullscreen().catch(() => {});
      return false;
    }
  }
}
