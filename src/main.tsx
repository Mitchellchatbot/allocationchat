import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import WidgetApp from "./WidgetApp.tsx";
import "./index.css";

// Detect if we're loading the widget embed route
const isWidgetEmbed = window.location.pathname.startsWith('/widget-embed/');

// Use minimal WidgetApp for embed (no ThemeProvider = no dark mode issues)
createRoot(document.getElementById("root")!).render(
  isWidgetEmbed ? <WidgetApp /> : <App />
);
