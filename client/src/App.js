// client/src/App.js
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import StockDetails from './pages/StockDetails';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/stock/:symbol" element={<StockDetails/>} />
      </Routes>
    </BrowserRouter>
  );
}
