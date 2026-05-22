import "./storage.js";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import BulletJournal from "./bullet-journal.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BulletJournal />
  </StrictMode>
);
