import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import RootApp from './RootApp.tsx';
import { LocaleProvider } from './contexts/LocaleContext';
import { PricingProvider } from './contexts/PricingContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocaleProvider>
      <PricingProvider>
        <RootApp />
      </PricingProvider>
    </LocaleProvider>
  </StrictMode>,
);


