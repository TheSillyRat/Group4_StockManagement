import React, { useState } from 'react';
import Navbar from './components/Navbar';
import AiInventoryEntry from './pages/AiInventoryEntry';
import ProductManagement from './pages/ProductManagement';
import WarehouseManagement from './pages/WarehouseManagement';
import TransactionHistory from './pages/TransactionHistory';

export default function App() {
  const [activeTab, setActiveTab] = useState('ai-entry');

  return (
    <div>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="container">
        {activeTab === 'ai-entry' && <AiInventoryEntry />}
        {activeTab === 'products' && <ProductManagement />}
        {activeTab === 'warehouses' && <WarehouseManagement />}
        {activeTab === 'history' && <TransactionHistory />}
      </main>
    </div>
  );
}
