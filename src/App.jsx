import React, { useState } from 'react';
import PinScreen from './components/PinScreen.jsx';
import DAW from './components/DAW.jsx';

export default function App() {
  const [unlocked, setUnlocked] = useState(false);

  return (
    <div className="app-root">
      {!unlocked && <PinScreen onUnlock={() => setUnlocked(true)} />}
      {unlocked && <DAW />}
    </div>
  );
}
