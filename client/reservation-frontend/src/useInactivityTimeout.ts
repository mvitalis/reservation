import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient'; // 👈 Importa tu instancia ya creada (ajusta la ruta si es necesario)

export function useInactivityTimeout(
  timeoutMinutes: number = 15,
  warningMinutesBefore: number = 2
) {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(warningMinutesBefore * 60);

  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/admin';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setShowWarning(false);
    setRemainingSeconds(warningMinutesBefore * 60);

    const totalMs = timeoutMinutes * 60 * 1000;
    const warningMs = warningMinutesBefore * 60 * 1000;
    const timeUntilWarning = totalMs - warningMs;

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      let secondsLeft = warningMinutesBefore * 60;
      setRemainingSeconds(secondsLeft);

      countdownIntervalRef.current = setInterval(() => {
        secondsLeft -= 1;
        setRemainingSeconds(secondsLeft);
        if (secondsLeft <= 0) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        }
      }, 1000);
    }, timeUntilWarning > 0 ? timeUntilWarning : 0);

    logoutTimerRef.current = setTimeout(() => {
      handleLogout();
    }, totalMs);
  }, [timeoutMinutes, warningMinutesBefore, handleLogout]);

  useEffect(() => {
    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];

    const handleUserActivity = () => {
      if (!showWarning) {
        resetTimer();
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity);
    });

    resetTimer();

    return () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [resetTimer, showWarning]);

  return { showWarning, remainingSeconds, resetTimer };
}