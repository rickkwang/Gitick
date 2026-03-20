import React from 'react';
import { useAppState } from './hooks/useAppState';
import { AppLayout } from './components/AppLayout';

export default function App() {
  const appState = useAppState();

  return <AppLayout {...appState} />;
}
