import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import ForgeLab from './app/forge-lab';
import Shot01WaterLab from './app/shot01-water-lab';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

const isShotOneWaterLab = /^\/forge\/shot\/1\/?$/.test(window.location.pathname);

root.render(
  <StrictMode>
    {isShotOneWaterLab ? <Shot01WaterLab /> : <ForgeLab />}
  </StrictMode>,
);
