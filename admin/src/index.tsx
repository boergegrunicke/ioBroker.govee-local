import React from 'react';
import { createRoot } from 'react-dom/client';

import App from './app';

const container = document.getElementById('root');
if (container) {
    createRoot(container).render(<App adapterName="govee-local" />);
}
