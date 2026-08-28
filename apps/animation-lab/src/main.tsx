import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import ForgeLab from './app/forge-lab';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <ForgeLab />
  </StrictMode>,
);
