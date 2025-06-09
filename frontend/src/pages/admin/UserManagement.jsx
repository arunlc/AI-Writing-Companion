// frontend/src/pages/admin/UserManagement.jsx - SIMPLIFIED VERSION
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import { usersAPI } from '../../services/api';
import {
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  EyeSlashIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'STUDENT',
    grade: '',
    parentEmail: '',
    password: ''
  });

  // Fetch users with search and filter
  const { data: usersResponse, isLoading, error } = useQuery(
    ['users', searchTerm, selectedRole],
    () => usersAPI.getAll({
      search: searchTerm || undefined,
      role: selectedRole || undefined,
      limit: 100
    }),
    {
      keepPreviousData: true,
      staleTime: 30000
    }
  );

  // Create user mutation
  const createUserMutation = useMutation(usersAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setShowCreateForm(false);
      resetNewUserForm();
      toast.success('User created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create user');
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation(
    ({ id, data }) => usersAPI.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['users']);
        setEditingUser(null);
        toast.success('User updated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update user');
      }
    }
  );

  // Delete user mutation
  const deleteUserMutation = useMutation(usersAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('User deactivated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to deactivate user');
    }
  });

  const users = usersResponse?.data?.users || [];

  const resetNewUserForm = () => {
    setNewUser({
      name: '',
      email: '',
      role: 'STUDENT',
      grade: '',
      parentEmail: '',
      password: ''
    });
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    
    // Generate password if not provided
    const userData = {
      ...newUser,
      password: newUser.password || generateRandomPassword()
    };
    
    createUserMutation.mutate(userData);
  };

  const generateRandomPassword = () => {
    return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
  };

  const handleUpdateUser = (userData) => {
    updateUserMutation.mutate({
      id: editingUser.id,
      data: userData
    });
  };

  const handleDeleteUser = (userId, userName) => {
    if (userId === currentUser.id) {
      toast.error("You cannot deactivate your own account");
      return;
    }
    
    if (window.confirm(`Are you sure you want to deactivate "${userName}"? They will no longer be able to login.`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      STUDENT: 'bg-blue-100 text-blue-800',
      ADMIN: 'bg-red-100 text-red-800',
      EDITOR: 'bg-green-100 text-green-800',
      REVIEWER: 'bg-yellow-100 text-yellow-800',
      SALES: 'bg-purple-100 text-purple-800',
      OPERATIONS: 'bg-indigo-100 text-indigo-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'ADMIN': return '👑';
      case 'EDITOR': return '✏️';
      case 'REVIEWER': return '🔍';
      case 'SALES': return '💼';
      case 'OPERATIONS': return '⚙️';
      default: return '👤';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !selectedRole || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

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
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              {filteredUsers.length} users found
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button onClick={() => setShowCreateForm(true)}>
              <PlusIcon className="h-5 w-5 mr-2" />
              Create User
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="STUDENT">👤 Students</option>
                <option value="EDITOR">✏️ Editors</option>
                <option value="REVIEWER">🔍 Reviewers</option>
                <option value="ADMIN">👑 Admins</option>
                <option value="SALES">💼 Sales</option>
                <option value="OPERATIONS">⚙️ Operations</option>
              </select>
            </div>
          </div>
        </div>

        {/* Create User Form */}
        {showCreateForm && (
          <div className="mb-6 bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create New User</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name *"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  placeholder="Enter full name"
                />
                
                <Input
                  label="Email *"
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  placeholder="Enter email address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  >
                    <option value="STUDENT">👤 Student</option>
                    <option value="EDITOR">✏️ Editor</option>
                    <option value="REVIEWER">🔍 Reviewer</option>
                    <option value="ADMIN">👑 Admin</option>
                    <option value="SALES">💼 Sales</option>
                    <option value="OPERATIONS">⚙️ Operations</option>
                  </select>
                </div>

                <Input
                  label="Password (optional)"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  placeholder="Leave blank for auto-generated"
                />
              </div>

              {newUser.role === 'STUDENT' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Grade/Class"
                    value={newUser.grade}
                    onChange={(e) => setNewUser({...newUser, grade: e.target.value})}
                    placeholder="e.g., Grade 10"
                  />
                  
                  <Input
                    label="Parent Email"
                    type="email"
                    value={newUser.parentEmail}
                    onChange={(e) => setNewUser({...newUser, parentEmail: e.target.value})}
                    placeholder="Parent's email"
                  />
                </div>
              )}

              <div className="flex space-x-3">
                <Button type="submit" disabled={createUserMutation.isLoading}>
                  {createUserMutation.isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create User'
                  )}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Users Grid */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {filteredUsers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={clsx(
                    'p-4 border rounded-lg hover:shadow-md transition-shadow',
                    user.isActive ? 'border-gray-200' : 'border-red-200 bg-red-50'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-lg">
                        {getRoleIcon(user.role)}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {user.name}
                        </h3>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {user.isActive ? (
                        <EyeIcon className="h-4 w-4 text-green-500" title="Active" />
                      ) : (
                        <EyeSlashIcon className="h-4 w-4 text-red-500" title="Inactive" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className={clsx(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                      getRoleColor(user.role)
                    )}>
                      {user.role}
                    </span>
                    
                    {user.grade && (
                      <div className="text-xs text-gray-600">
                        <strong>Grade:</strong> {user.grade}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500">
                      Created {formatDate(user.createdAt)}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Edit user"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    
                    {currentUser.id !== user.id && (
                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Deactivate user"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedRole ? 'Try adjusting your search criteria.' : 'Get started by creating your first user.'}
              </p>
              {!searchTerm && !selectedRole && (
                <div className="mt-6">
                  <Button onClick={() => setShowCreateForm(true)}>
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Create User
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
