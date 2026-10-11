import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './experience.css';
import '../shared/ui/tooltips.css';
import './glass.css';
import {installTooltips} from '../shared/ui/tooltips';

document.title = window.loaderly?.appName ?? 'Loaderly';

function Tooltips(){React.useEffect(()=>installTooltips(document),[]);return null;}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
    <Tooltips />
  </React.StrictMode>
);
