// src/App.js
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import StockDetails from "./pages/StockDetails";
import TrendlinePage from "./pages/TrendlinePage";
import Favorites from "./pages/Favorites";   // ⭐ NEW
import Footer from "./components/Footer";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home */}
        <Route path="/" element={<Home />} />

        {/* Stock details */}
        <Route path="/stock/:symbol" element={<StockDetails />} />

        {/* Trendline tool */}
        <Route path="/trendline" element={<TrendlinePage />} />
        <Route path="/trendline/:symbol" element={<TrendlinePage />} />

        {/* ⭐ NEW Favorites page */}
        <Route path="/favorites" element={<Favorites />} />
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}
