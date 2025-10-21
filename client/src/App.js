// src/App.js (example)
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import StockDetails from "./pages/StockDetails";
import Footer from "./components/Footer";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/stock/:symbol" element={<StockDetails />} />
        {/* other routes... */}
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}
