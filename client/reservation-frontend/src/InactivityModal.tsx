'use client';

interface InactivityModalProps {
  show: boolean;
  remainingSeconds: number;
  onStayConnected: () => void;
}

export function InactivityModal({ show, remainingSeconds, onStayConnected }: InactivityModalProps) {
  if (!show) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl text-white">
        <h3 className="text-xl font-semibold mb-2">¿Sigues ahí?</h3>
        <p className="text-slate-400 text-sm mb-4">
          Tu sesión se cerrará automáticamente por inactividad en{' '}
          <span className="font-bold text-amber-400">
            {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
          </span>{' '}
          minutos.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onStayConnected}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors text-sm"
          >
            Seguir conectado
          </button>
        </div>
      </div>
    </div>
  );
}