import React from 'react';
import { useAppState } from './hooks/useAppState';
import { AppLayout } from './components/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const appState = useAppState();

  return (
    <ErrorBoundary>
      <AppLayout {...appState} />
    </ErrorBoundary>
  );
}
