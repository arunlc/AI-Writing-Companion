import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationBell } from '../ui/Notifications';
import { 
  HomeIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CalendarIcon,
  ClipboardDocumentCheckIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavigationItems = () => {
    const baseItems = [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: HomeIcon,
        roles: ['STUDENT', 'ADMIN', 'EDITOR', 'REVIEWER', 'SALES', 'OPERATIONS']
      },
      {
        name: 'My Submissions',
        href: '/submissions',
        icon: DocumentTextIcon,
        roles: ['STUDENT', 'ADMIN', 'EDITOR']
      }
    ];

    const roleSpecificItems = {
      STUDENT: [
        {
          name: 'New Submission',
          href: '/submissions/new',
          icon: PlusIcon,
          highlight: true
        },
        {
          name: 'Events',
          href: '/events',
          icon: CalendarIcon
        }
      ],
      ADMIN: [
        {
          name: 'User Management',
          href: '/admin/users',
          icon: UserGroupIcon
        },
        {
          name: 'All Submissions',
          href: '/submissions',
          icon: DocumentTextIcon
        },
        {
          name: 'Events',
          href: '/events',
          icon: CalendarIcon
        },
        {
          name: 'Reviews',
          href: '/reviews',
          icon: ClipboardDocumentCheckIcon
        }
      ],
      EDITOR: [
        {
          name: 'Assigned Students',
          href: '/submissions',
          icon: DocumentTextIcon
        },
        {
          name: 'Events',
          href: '/events',
          icon: CalendarIcon
        }
      ],
      REVIEWER: [
        {
          name: 'Review Queue',
          href: '/reviews',
          icon: ClipboardDocumentCheckIcon
        }
      ],
      SALES: [
        {
          name: 'Events',
          href: '/events',
          icon: CalendarIcon
        }
      ],
      OPERATIONS: [
        {
          name: 'All Submissions',
          href: '/submissions',
          icon: DocumentTextIcon
        },
        {
          name: 'Events',
          href: '/events',
          icon: CalendarIcon
        }
      ]
    };

    const userItems = baseItems.filter(item => 
      item.roles.includes(user?.role)
    );

    const specificItems = roleSpecificItems[user?.role] || [];

    return [...userItems, ...specificItems];
  };

  const navigationItems = getNavigationItems();

  const NavItem = ({ item, mobile = false }) => {
    const isActive = location.pathname === item.href || 
      (item.href !== '/dashboard' && location.pathname.startsWith(item.href));

    return (
      <Link
        to={item.href}
        onClick={() => mobile && setSidebarOpen(false)}
        className={clsx(
          'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
          isActive
            ? 'bg-primary-100 text-primary-900'
            : item.highlight
            ? 'text-primary-600 hover:bg-primary-50 hover:text-primary-700'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        )}
      >
        <item.icon
          className={clsx(
            'mr-3 flex-shrink-0 h-5 w-5',
            isActive
              ? 'text-primary-500'
              : item.highlight
              ? 'text-primary-500'
              : 'text-gray-400 group-hover:text-gray-500'
          )}
        />
        {item.name}
        {item.highlight && (
          <span className="ml-auto inline-block py-0.5 px-2 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
            New
          </span>
        )}
      </Link>
    );
  };

  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full">
      <div className="flex items-center h-16 flex-shrink-0 px-4 bg-primary-700">
        <img
          className="h-8 w-auto"
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' /%3E%3C/svg%3E"
          alt="AI Writing Companion"
        />
        <span className="ml-2 text-white font-semibold text-lg">
          AI Writing Companion
        </span>
      </div>
      
      <div className="flex-1 flex flex-col overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigationItems.map((item) => (
            <NavItem key={item.name} item={item} mobile={mobile} />
          ))}
        </nav>
      </div>

      <div className="flex-shrink-0 p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
              <UserIcon className="h-5 w-5 text-primary-600" />
            </div>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <Link
            to="/profile"
            className="block px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
            onClick={() => mobile && setSidebarOpen(false)}
          >
            Profile Settings
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
      <div className={clsx(
        'fixed inset-0 flex z-40 md:hidden',
        sidebarOpen ? 'block' : 'hidden'
      )}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>
          <SidebarContent mobile />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-white shadow">
            <SidebarContent />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top navigation bar for mobile */}
        <div className="md:hidden">
          <div className="flex items-center justify-between pl-1 pt-1 pr-4 pb-1 sm:pl-3 sm:pt-3 sm:pr-6 sm:pb-3 bg-white shadow-sm">
            <button
              className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            {/* Mobile notification bell */}
            <NotificationBell />
          </div>
        </div>

        {/* Desktop top bar with notifications */}
        <div className="hidden md:flex md:items-center md:justify-end md:px-6 md:py-3 bg-white shadow-sm border-b border-gray-200">
          <NotificationBell />
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
