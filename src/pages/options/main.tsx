import React from "react";
import { createRoot } from "react-dom/client";
import "../ui.css";
import { OptionsApp } from "./optionsApp";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>
);

