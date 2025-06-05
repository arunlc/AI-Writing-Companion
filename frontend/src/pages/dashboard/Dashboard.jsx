import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from 'react-query';
import { dashboardAPI } from '../../services/api';
import {
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  UserGroupIcon,
  CalendarIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';

const Dashboard = () => {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery(
    'dashboard-stats',
    dashboardAPI.getStats,
    {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 0,
      cacheTime: 0
    }
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      STUDENT: 'Student',
      ADMIN: 'Administrator',
      EDITOR: 'Editor',
      REVIEWER: 'Reviewer',
      SALES: 'Sales Team',
      OPERATIONS: 'Operations Team'
    };
    return roleNames[role] || role;
  };

  const StatsCard = ({ title, value, icon: Icon, color = 'blue', action }) => (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-lg font-medium text-gray-900">
                {value}
              </dd>
            </dl>
          </div>
        </div>
        {action && (
          <div className="mt-3">
            {action}
          </div>
        )}
      </div>
    </div>
  );

  const StudentDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow">
        <div className="px-6 py-8 text-white">
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {user?.name}!
          </h1>
          <p className="mt-2 text-primary-100">
            Ready to continue your writing journey?
          </p>
          <div className="mt-4">
            <Link to="/submissions/new">
              <Button variant="secondary" className="bg-white text-primary-700 hover:bg-gray-50">
                <PlusIcon className="h-5 w-5 mr-2" />
                Start New Submission
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Submissions"
          value={stats?.totalSubmissions || '0'}
          icon={DocumentTextIcon}
          color="blue"
        />
        <StatsCard
          title="In Progress"
          value={stats?.inProgressSubmissions || '0'}
          icon={ClockIcon}
          color="yellow"
        />
        <StatsCard
          title="Completed"
          value={stats?.completedSubmissions || '0'}
          icon={CheckCircleIcon}
          color="green"
        />
        <StatsCard
          title="Upcoming Events"
          value={stats?.upcomingEvents || '0'}
          icon={CalendarIcon}
          color="purple"
        />
      </div>

      {/* Recent Submissions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Submissions</h3>
        </div>
        <div className="p-6">
          {stats?.recentSubmissions?.length > 0 ? (
            <div className="space-y-4">
              {stats.recentSubmissions.map((submission) => (
                <div key={submission.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{submission.title}</h4>
                    <p className="text-sm text-gray-500">
                      Stage: {submission.currentStage?.replace('_', ' ')}
                    </p>
                  </div>
                  <Link
                    to={`/submissions/${submission.id}`}
                    className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No submissions yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first submission.
              </p>
              <div className="mt-6">
                <Link to="/submissions/new">
                  <Button>
                    <PlusIcon className="h-5 w-5 mr-2" />
                    New Submission
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const AdminDashboard = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {getGreeting()}, {user?.name}
        </h1>
        <p className="text-gray-600">System Overview</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={stats?.totalUsers || '0'}
          icon={UserGroupIcon}
          color="blue"
        />
        <StatsCard
          title="Total Submissions"
          value={stats?.totalSubmissions || '0'}
          icon={DocumentTextIcon}
          color="green"
        />
        <StatsCard
          title="Pending Reviews"
          value={stats?.pendingReviews || '0'}
          icon={ClipboardDocumentCheckIcon}
          color="yellow"
        />
        <StatsCard
          title="Active Events"
          value={stats?.activeEvents || '0'}
          icon={CalendarIcon}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link to="/admin/users" className="block">
              <Button variant="secondary" className="w-full justify-start">
                <UserGroupIcon className="h-5 w-5 mr-2" />
                Manage Users
              </Button>
            </Link>
            <Link to="/submissions" className="block">
              <Button variant="secondary" className="w-full justify-start">
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                View All Submissions
              </Button>
            </Link>
            <Link to="/events" className="block">
              <Button variant="secondary" className="w-full justify-start">
                <CalendarIcon className="h-5 w-5 mr-2" />
                Manage Events
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">API Status</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Database</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">AI Service</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Available
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const RoleDashboard = () => {
    const dashboards = {
      STUDENT: <StudentDashboard />,
      ADMIN: <AdminDashboard />,
      EDITOR: <StudentDashboard />, // Similar to student but with assigned students
      REVIEWER: <StudentDashboard />, // Will show review queue
      SALES: <StudentDashboard />, // Will show events and sales data
      OPERATIONS: <StudentDashboard /> // Will show file management
    };

    return dashboards[user?.role] || <StudentDashboard />;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <RoleDashboard />
      </div>
    </div>
  );
};

export default Dashboard;
