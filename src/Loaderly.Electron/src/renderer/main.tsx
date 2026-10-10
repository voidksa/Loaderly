import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';
import '../shared/ui/tooltips.css';
import {installTooltips} from '../shared/ui/tooltips';

function Tooltips(){React.useEffect(()=>installTooltips(document),[]);return null;}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
    <Tooltips />
  </React.StrictMode>
);
