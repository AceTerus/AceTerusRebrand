import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import EventsApp from "./EventsApp";

createRoot(document.getElementById("events-root")!).render(
  <StrictMode>
    <EventsApp />
  </StrictMode>
);
