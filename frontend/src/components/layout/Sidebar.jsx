import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

//collapsible left navigation panel.

const Sidebar = ({ page, onNav, onNewVehicle, currentUser, onLogout }) => {
  // collapsed state is local — the flex layout handles content expansion automatically
  const [collapsed, setCollapsed] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  // Build the nav items list; Settings is conditionally included for admins only
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="sidebar-icon">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10
               0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4
               15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10
               -3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
        </svg>
      ),
      action: () => onNav('dashboard'),
    },
    {
      id: 'new-vehicle',
      label: 'New Vehicle',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="sidebar-icon">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" />
        </svg>
      ),
      action: onNewVehicle,
    },
    {
      id: 'history',
      label: 'Vehicle History',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="sidebar-icon">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      action: () => onNav('history'),
    },
    // Settings is only added to the list for admin users
    ...(isAdmin ? [{
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="sidebar-icon">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 012.573
               1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065
               2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066
               2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572
               1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573
               -1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065
               -2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066
               -2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      action: () => onNav('settings'),
    }] : []),
  ];

  return (
    <aside className={`app-sidebar ${collapsed ? 'app-sidebar--collapsed' : ''}`}>

      {/* ── Navigation items ──────────────────────────────── */}
      <nav className="sidebar-nav">
        {/* Section label hidden when collapsed (conditional render, not CSS) */}
        {!collapsed && <p className="sidebar-section-label">Navigation</p>}

        {navItems.map(item => (
          <button
            key={item.id}
            className={`sidebar-item ${page === item.id ? 'active' : ''}`}
            onClick={item.action}
            /* title provides hover tooltip for icon-only collapsed state */
            title={collapsed ? item.label : undefined}
          >
            {item.icon}
            {/* Label hidden when collapsed */}
            {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
          </button>
        ))}

        {/* Collapse / expand toggle button */}
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRightIcon style={{ width: 16, height: 16 }} />
          ) : (
            <>
              <ChevronLeftIcon style={{ width: 16, height: 16 }} />
              <span style={{ marginLeft: 6, fontSize: '0.75rem' }}>Collapse</span>
            </>
          )}
        </button>
      </nav>

      {/* ── Bottom: help card + user info ─────────────────── */}
      <div className="sidebar-footer">

        {/* Help card — hidden when collapsed */}
        {!collapsed && (
          <div className="sidebar-help">
            <div className="sidebar-help-card">
              <p className="sidebar-help-title">Need help?</p>
              <p className="sidebar-help-text">
                View FAQs and guidance on using RecyWise effectively.
              </p>
              <button className="sidebar-help-btn" onClick={() => onNav('support')}>
                View Support →
              </button>
            </div>
          </div>
        )}

        {/* User info strip — avatar always visible; name/role hidden when collapsed */}
        <div className="sidebar-user-info">
          <div className="sidebar-user-card">

            {/* Avatar: first letter of the user's name */}
            <div className="sidebar-user-avatar" title={currentUser?.name}>
              {currentUser?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>

            {/* Name and role — hidden when collapsed */}
            {!collapsed && (
              <div className="sidebar-user-details">
                <div className="sidebar-user-name">{currentUser?.name}</div>
                <div className="sidebar-user-role">{currentUser?.role}</div>
              </div>
            )}

            {/* Logout button — always visible (icon only) */}
            <button
              className="sidebar-logout-btn"
              onClick={onLogout}
              title="Logout"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"
                style={{ width: 16, height: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3
                     3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>

          </div>
        </div>
      </div>

    </aside>
  );
};

export default Sidebar;