import React, { useState } from 'react';
import { ShieldAlert, KeyRound, Fingerprint, Lock, Unlock, AlertTriangle } from 'lucide-react';

interface LockdownModalProps {
  isLocked: boolean;
  onUnlock: () => void;
}

export const LockdownModal: React.FC<LockdownModalProps> = ({ isLocked, onUnlock }) => {
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  if (!isLocked) return null;

  const handleUnlockAttempt = () => {
    // Allows default emergency override or '1138' / 'stark'
    if (!passcode || passcode === '1138' || passcode.toLowerCase() === 'stark' || passcode === '0000') {
      onUnlock();
    } else {
      setErrorMsg('OVERRIDE CODE INVALID');
      setTimeout(() => setErrorMsg(''), 2000);
    }
  };

  const handleBiometricScan = () => {
    setIsAuthorizing(true);
    setTimeout(() => {
      setIsAuthorizing(false);
      onUnlock();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#060003]/95 backdrop-blur-xl flex items-center justify-center p-4">
      {/* Red warning border and pulse */}
      <div className="absolute inset-0 border-4 border-[#ff0055] opacity-50 animate-pulse pointer-events-none" />
      
      <div className="relative max-w-lg w-full bg-[#120007]/90 border border-[#ff0055] shadow-[0_0_50px_rgba(255,0,85,0.4)] rounded-lg p-6 sm:p-8 text-center text-[#ffcddb]">
        {/* Warning Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-[#ff0055]/20 border border-[#ff0055] flex items-center justify-center mb-4 animate-bounce">
          <ShieldAlert className="w-9 h-9 text-[#ff0055]" />
        </div>

        <h2 className="font-orbitron font-black text-2xl sm:text-3xl tracking-widest text-[#ff0055] drop-shadow-[0_0_15px_#ff0055] mb-1">
          PERIMETER LOCKDOWN
        </h2>
        <p className="text-xs font-mono-tech text-gray-400 tracking-wider mb-6">
          ALL LAPTOP PORTS, PERIPHERALS & NETWORKS RESTRICTED TO SECURE CONFINEMENT
        </p>

        {/* Security Matrix Details */}
        <div className="bg-black/60 border border-[#ff0055]/30 rounded p-3 text-left font-mono-tech text-xs space-y-1.5 mb-6">
          <div className="flex justify-between text-gray-400">
            <span>PROTOCOL STATUS:</span>
            <span className="text-[#ff0055] font-bold">ACTIVE LOCK</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>PERIMETER CIPHER:</span>
            <span className="text-[#ff99bb]">AES-256 QUANTUM LATTICE</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>OVERRIDE AUTHORITY:</span>
            <span className="text-white">TONY STARK // LEVEL 7</span>
          </div>
        </div>

        {/* Passcode Input */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 max-w-xs mx-auto">
            <div className="relative flex-1">
              <input
                type="password"
                placeholder="ENTER OVERRIDE PIN"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlockAttempt()}
                className="w-full bg-black/80 border border-[#ff0055]/60 rounded px-3 py-2 text-center text-sm font-mono tracking-widest text-[#ff0055] placeholder-[#ff0055]/40 focus:outline-none focus:border-[#ff0055]"
              />
            </div>
            <button
              onClick={handleUnlockAttempt}
              className="px-4 py-2 bg-[#ff0055] hover:bg-[#ff2270] text-black font-orbitron font-bold text-xs rounded transition-colors"
            >
              <Unlock className="w-4 h-4" />
            </button>
          </div>

          {errorMsg && (
            <div className="text-xs font-mono-tech text-[#ff0055] font-bold animate-shake">
              {errorMsg}
            </div>
          )}

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-[#ff0055]/30"></div>
            <span className="flex-shrink mx-3 text-[10px] font-mono-tech text-gray-500">OR AUTHORIZE BIOMETRICS</span>
            <div className="flex-grow border-t border-[#ff0055]/30"></div>
          </div>

          {/* Biometric Override Button */}
          <button
            onClick={handleBiometricScan}
            disabled={isAuthorizing}
            className="w-full max-w-xs mx-auto py-2.5 px-4 bg-[#ff0055]/15 hover:bg-[#ff0055]/30 border border-[#ff0055]/50 rounded text-xs font-orbitron tracking-widest text-[#ff99bb] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Fingerprint className={`w-4 h-4 text-[#ff0055] ${isAuthorizing ? 'animate-spin' : ''}`} />
            <span>{isAuthorizing ? 'SCANNING BIOMETRIC RETINA...' : 'SCAN BIOMETRIC OVERRIDE'}</span>
          </button>
        </div>

        <div className="mt-6 text-[10px] font-mono-tech text-gray-500">
          STARK INDUSTRIES DEFENSE PROTOCOL 84-B
        </div>
      </div>
    </div>
  );
};
