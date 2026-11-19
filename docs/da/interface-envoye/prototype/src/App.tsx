import { useEffect, useState } from "react";
import CoverageScreen from "../interface/screen-11-1/Screen";
import TestValidationScreen from "../interface/screen-11-2/Screen";
import LivePassageScreen from "../interface/screen-11-3/Screen";
import PassageReportScreen from "../interface/screen-11-4/Screen";
import InvoiceComparisonScreen from "../interface/screen-11-5/Screen";
import ReviewScreen from "../interface/screen-11-6/Screen";
import DocumentationCorrectionScreen from "../interface/screen-11-7/Screen";
import PassageHistoryScreen from "../interface/screen-11-8/Screen";
import LoginScreen from "../interface/login/Screen";

function currentRoute() {
  return window.location.hash.replace("#", "").split("?")[0];
}

export default function App() {
  const [route, setRoute] = useState(currentRoute);

  useEffect(() => {
    const syncRoute = () => setRoute(currentRoute());
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  if (route === "login") {
    return <LoginScreen />;
  }

  if (route === "screen-11-2") {
    return <TestValidationScreen />;
  }

  if (route === "screen-11-3") {
    return <LivePassageScreen />;
  }

  if (route === "screen-11-4") {
    return <PassageReportScreen />;
  }

  if (route === "screen-11-5") {
    return <InvoiceComparisonScreen />;
  }

  if (route === "screen-11-6") {
    return <ReviewScreen />;
  }

  if (route === "screen-11-7") {
    return <DocumentationCorrectionScreen />;
  }

  if (route === "screen-11-8") {
    return <PassageHistoryScreen />;
  }

  return <CoverageScreen />;
}
