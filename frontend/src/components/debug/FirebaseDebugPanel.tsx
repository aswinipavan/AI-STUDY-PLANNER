'use client';

import { useEffect, useState } from 'react';

interface LogEntry {
  time: string;
  level: 'info' | 'error' | 'warn';
  message: string;
  data?: any;
}

export function FirebaseDebugPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    // Capture console logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      const message = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
      if (message.includes('[Firebase') || message.includes('auth/')) {
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          level: 'info',
          message,
        }]);
      }
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      const message = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        level: 'error',
        message,
      }]);
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      const message = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
      if (message.includes('[Firebase') || message.includes('auth/')) {
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          level: 'warn',
          message,
        }]);
      }
      originalWarn.apply(console, args);
    };

    // Also capture Firebase config
    if (typeof window !== 'undefined') {
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        level: 'info',
        message: 'Firebase Environment Check',
        data: {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 
            `${process.env.NEXT_PUBLIC_FIREBASE_API_KEY.substring(0, 10)}... (${process.env.NEXT_PUBLIC_FIREBASE_API_KEY.length} chars)` : 
            'MISSING',
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'MISSING',
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'MISSING',
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'MISSING',
        }
      }]);
    }

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '10px 15px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          zIndex: 9999,
          fontSize: '14px',
          fontWeight: '600',
        }}
      >
        🐛 Debug Panel
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '500px',
      maxHeight: '400px',
      background: '#1e293b',
      color: '#f1f5f9',
      border: '1px solid #334155',
      borderRadius: '12px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
      zIndex: 9999,
      fontFamily: 'monospace',
      fontSize: '12px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '12px 16px',
        background: '#0f172a',
        borderBottom: '1px solid #334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
          🐛 Firebase Debug Console
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setLogs([])}
            style={{
              padding: '4px 8px',
              background: '#334155',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            Clear
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              padding: '4px 8px',
              background: '#334155',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            ✕
          </button>
        </div>
      </div>
      <div style={{
        padding: '12px',
        overflowY: 'auto',
        flexGrow: 1,
      }}>
        {logs.length === 0 ? (
          <div style={{ color: '#94a3b8', padding: '20px', textAlign: 'center' }}>
            No logs yet. Try logging in or registering.
          </div>
        ) : (
          logs.map((log, i) => (
            <div
              key={i}
              style={{
                marginBottom: '8px',
                padding: '8px',
                background: log.level === 'error' ? '#7f1d1d' : log.level === 'warn' ? '#78350f' : '#1e3a5f',
                borderRadius: '6px',
                borderLeft: `3px solid ${log.level === 'error' ? '#ef4444' : log.level === 'warn' ? '#f59e0b' : '#3b82f6'}`,
              }}
            >
              <div style={{ 
                color: '#94a3b8', 
                fontSize: '10px', 
                marginBottom: '4px',
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <span>{log.time}</span>
                <span style={{ 
                  textTransform: 'uppercase',
                  color: log.level === 'error' ? '#ef4444' : log.level === 'warn' ? '#f59e0b' : '#3b82f6',
                  fontWeight: 'bold',
                }}>
                  {log.level}
                </span>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {log.message}
              </div>
              {log.data && (
                <pre style={{ 
                  marginTop: '8px', 
                  padding: '8px', 
                  background: '#0f172a',
                  borderRadius: '4px',
                  fontSize: '11px',
                  overflow: 'auto',
                }}>
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
