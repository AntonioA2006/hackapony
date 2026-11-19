import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { warmUpApi } from "./shared/api/client";
import { AuthProvider } from "./shared/auth/AuthContext";
import { RegionProvider } from "./shared/region/RegionContext";
import { ViewProvider } from "./shared/viewMode";
import "./index.css";
import "leaflet/dist/leaflet.css";

warmUpApi();

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <RegionProvider>
            <ViewProvider>
              <App />
            </ViewProvider>
          </RegionProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);