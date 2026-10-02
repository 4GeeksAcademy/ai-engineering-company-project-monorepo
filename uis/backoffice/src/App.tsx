import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import IncidentsAnalysisPage from "./pages/IncidentsAnalysisPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/incidents" element={<IncidentsAnalysisPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
