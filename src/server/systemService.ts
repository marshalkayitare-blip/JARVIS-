import os from 'os';

export interface SystemTelemetry {
  cpu: string;
  memory: string;
  usedMemMB: number;
  totalMemMB: number;
  uptime: string;
  uptimeSeconds: number;
  platform: string;
  arch: string;
  hostname: string;
  coreFrequency: string;
  uplinkStatus: string;
  neuralLoad: string;
  temperature: string;
  status: 'ONLINE' | 'STANDBY' | 'CRITICAL';
}

export function getSystemTelemetry(): SystemTelemetry {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = Math.min(100, Math.max(0, (usedMem / totalMem) * 100)).toFixed(1);

  const totalMemMB = Math.round(totalMem / (1024 * 1024));
  const usedMemMB = Math.round(usedMem / (1024 * 1024));

  const uptimeSecs = Math.floor(os.uptime());
  const hours = Math.floor(uptimeSecs / 3600);
  const minutes = Math.floor((uptimeSecs % 3600) / 60);

  const loadAvg = os.loadavg();
  const cpuLoad = Math.min(100, Math.max(3.2, (loadAvg[0] * 12) + (Math.sin(Date.now() / 3000) * 4) + 14)).toFixed(1);

  const neuralLoad = Math.min(99, Math.max(12, 42 + Math.cos(Date.now() / 2500) * 15)).toFixed(0);
  const temperature = (38.5 + (parseFloat(cpuLoad) * 0.18)).toFixed(1);

  return {
    cpu: `${cpuLoad}%`,
    memory: `${memUsagePercent}%`,
    usedMemMB,
    totalMemMB,
    uptime: `${hours}h ${minutes}m`,
    uptimeSeconds: uptimeSecs,
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    coreFrequency: '4.80 GHz',
    uplinkStatus: 'SECURE QUANTUM LINK',
    neuralLoad: `${neuralLoad}%`,
    temperature: `${temperature}°C`,
    status: 'ONLINE',
  };
}
