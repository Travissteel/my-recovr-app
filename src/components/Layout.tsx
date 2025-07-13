import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Programs', href: '/programs', icon: '🎯' },
    { name: 'Community', href: '/community', icon: '👥' },
    { name: 'Crisis', href: '/crisis', icon: '🚨' },
    { name: 'Profile', href: '/profile', icon: '👤' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                RecovR
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Welcome, {user?.firstName}
              </span>
              <button
                onClick={logout}
                className="btn-secondary text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white dark:bg-gray-800 shadow-sm min-h-screen">
          <div className="p-6">
            <ul className="space-y-2">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`
                      flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors
                      ${isActive(item.href)
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;