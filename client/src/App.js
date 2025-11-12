// src/App.js
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import StockDetails from "./pages/StockDetails";
import TrendlinePage from "./pages/TrendlinePage";
import Footer from "./components/Footer";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/stock/:symbol" element={<StockDetails />} />

        {/* Trendline tool – supports optional :symbol */}
        <Route path="/trendline" element={<TrendlinePage />} />
        <Route path="/trendline/:symbol" element={<TrendlinePage />} />
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}
