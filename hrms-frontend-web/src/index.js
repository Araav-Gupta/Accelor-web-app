import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import ThemeContextProvider from './context/ThemeContext';

const container = document.getElementById('root');
const root = createRoot(container);

// Add Inter font to the document head
const link = document.createElement('link');
link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
link.rel = 'stylesheet';
document.head.appendChild(link);

root.render(
  <AuthProvider>
    <ThemeContextProvider>
      <App />
    </ThemeContextProvider>
  </AuthProvider>
);