import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChatPage } from './pages/ChatPage';
import { CalmSpace } from './pages/CalmSpace';
import { LoginPage } from './pages/LoginPage';
import { DisclaimerModal } from './components/DisclaimerModal';
import './config/amplify'; // Initialize Amplify

function App() {
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(() => {
    // Initialize from localStorage
    return localStorage.getItem('disclaimer_accepted') === 'true';
  });

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('disclaimer_accepted', 'true');
    setDisclaimerAccepted(true);
  };

  return (
    <Router>
      <div className="App">
        {!disclaimerAccepted && (
          <DisclaimerModal onAccept={handleAcceptDisclaimer} />
        )}
        
        <Routes>
          <Route 
            path="/" 
            element={<CalmSpace />} 
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
