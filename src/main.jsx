import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

createRoot(document.getElementById('root')).render(
  <ConvexProvider client={convex}>
    <h1>HowAI</h1>
  </ConvexProvider>,
);
