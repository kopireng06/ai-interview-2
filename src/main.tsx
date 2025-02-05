import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import CheckInterviewResult from "./Check.tsx"; // Import Check component
import "./index.css";

const rootElement = document.getElementById("root")!;

// Check if the current path includes 'check'
const isCheckPath = window.location.pathname.includes("check");

createRoot(rootElement).render(
  <StrictMode>{isCheckPath ? <CheckInterviewResult /> : <App />}</StrictMode>
);
