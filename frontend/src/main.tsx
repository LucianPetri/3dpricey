/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Disable right-click context menu globally
document.addEventListener('contextmenu', (event) => event.preventDefault());

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
