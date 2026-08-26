import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import RootApp from './RootApp.tsx';
import { PricingProvider } from './contexts/PricingContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PricingProvider>
      <RootApp />
    </PricingProvider>
  </StrictMode>,
);


