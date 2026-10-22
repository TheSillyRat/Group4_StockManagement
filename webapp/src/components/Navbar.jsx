import React from 'react';

export default function Navbar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'ai-entry', label: '🤖 AI Inventory Entry' },
    { id: 'products', label: '📦 Product Management' },
    { id: 'warehouses', label: '🏢 Warehouse Management' },
    { id: 'history', label: '📜 Transaction History' }
  ];

  return (
    <header style={{
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-secondary)',
      padding: '14px 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            color: '#0f172a',
            fontSize: '1.1rem'
          }}>
            ⚡
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Group 4 <span style={{ color: 'var(--accent)' }}>Stock Management</span>
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
              AI-Powered Inventory & Real-Time Stock System
            </p>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                background: activeTab === item.id ? 'var(--accent)' : 'transparent',
                color: activeTab === item.id ? '#0f172a' : 'var(--text-secondary)',
                fontWeight: activeTab === item.id ? 700 : 500,
                fontSize: '0.88rem',
                transition: 'all 0.2s',
                border: activeTab === item.id ? '1px solid var(--accent)' : '1px solid transparent'
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
