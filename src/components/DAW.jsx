import React from 'react';
import TopBar from './TopBar.jsx';
import Browser from './Browser.jsx';
import ArrangementView from './ArrangementView.jsx';
import SessionView from './SessionView.jsx';
import DetailView from './DetailView.jsx';
import { useDawStore } from '../store/dawStore.js';

export default function DAW() {
  const { browserOpen, detailOpen, activeView, toggleBrowser } = useDawStore();

  return (
    <div className="daw-root">
      <TopBar />
      <div className="daw-body">
        {/* Browser toggle tab */}
        <div className={`browser-wrapper${browserOpen ? ' browser-open' : ' browser-closed'}`}>
          <Browser />
        </div>
        <button
          className={`browser-toggle${browserOpen ? ' browser-toggle-open' : ''}`}
          onClick={toggleBrowser}
          title={browserOpen ? 'Hide Browser' : 'Show Browser'}
        >
          <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
            <path
              d={browserOpen ? 'M7 1L2 7L7 13' : 'M3 1L8 7L3 13'}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Main view area */}
        <div className="main-area">
          <div className="view-area">
            {activeView === 'arrangement' && <ArrangementView />}
            {activeView === 'session' && <SessionView />}
          </div>

          {detailOpen && (
            <div className="detail-wrapper">
              <DetailView />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
