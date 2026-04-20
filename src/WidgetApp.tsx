import { BrowserRouter, Routes, Route } from "react-router-dom";
import WidgetEmbed from "./pages/WidgetEmbed";
import "./index.css";

// Apply transparency immediately before React renders
document.documentElement.classList.add('widget-embed-mode');
document.documentElement.style.setProperty('background', 'transparent', 'important');
document.body.style.setProperty('background', 'transparent', 'important');

// Also ensure #root is transparent
const rootElement = document.getElementById('root');
if (rootElement) {
  rootElement.style.setProperty('background', 'transparent', 'important');
}

// Minimal app specifically for widget embed - no ThemeProvider = no dark mode issues
const WidgetApp = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/widget-embed/:propertyId" element={<WidgetEmbed />} />
    </Routes>
  </BrowserRouter>
);

export default WidgetApp;
