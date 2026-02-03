import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from './App';
import "./index.css";
import "./i18n";
import { cacheBuster } from './utils/cache-buster';

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <App/>
    </HelmetProvider>
  </StrictMode>,
);
