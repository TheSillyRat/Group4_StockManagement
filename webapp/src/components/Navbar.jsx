import React from 'react';

export default function Navbar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'ai-entry', label: '🤖 AI Inventory Entry' },
    { id: 'products', label: '📦 Product Management' },
    { id: 'warehouses', label: '🏢 Warehouse Management' },
    { id: 'history', label: '📜 Transaction History' }
  ];

  return (
    <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '16px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent)' }}>
          Inventory AI System
        </h2>
        <nav style={{ display: 'flex', gap: '8px' }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                background: activeTab === item.id ? 'var(--accent)' : 'transparent',
                color: activeTab === item.id ? '#0f172a' : 'var(--text-secondary)',
                fontWeight: activeTab === item.id ? 700 : 500,
                transition: 'all 0.2s'
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
