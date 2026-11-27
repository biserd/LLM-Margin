import { createRoot } from "react-dom/client";
import App from "./App";
import { clearInitialRouteMetadata } from "./components/RouteMetadata";
import "./index.css";

// Prerendered metadata serves the initial HTML. Once the router takes over,
// React owns these tags and removes them when their route changes.
clearInitialRouteMetadata();

createRoot(document.getElementById("root")!).render(<App />);
