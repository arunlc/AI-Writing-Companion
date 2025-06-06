// src/pages/admin/UserManagement.jsx
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
  FunnelIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon
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
  const [filters, setFilters] = useState({
    role: '',
    search: '',
    isActive: ''
  });
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'STUDENT',
    grade: '',
    parentEmail: '',
    password: ''
  });

  // Fetch users
  const { data: usersResponse, isLoading, error } = useQuery(
    ['users', filters],
    () => usersAPI.getAll(filters),
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
      setNewUser({
        name: '',
        email: '',
        role: 'STUDENT',
        grade: '',
        parentEmail: '',
        password: ''
      });
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
      toast.success('User deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete user');
    }
  });

  // Assign editor mutation
  const assignEditorMutation = useMutation(
    ({ studentId, editorId }) => usersAPI.assignEditor(studentId, editorId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['users']);
        toast.success('Editor assigned successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to assign editor');
      }
    }
  );

  const users = usersResponse?.data?.users || [];
  const pagination = usersResponse?.data?.pagination || {};

  const handleCreateUser = (e) => {
    e.preventDefault();
    
    // Generate password if not provided
    const userData = {
      ...newUser,
      password: newUser.password || `temp${Math.random().toString(36).slice(2, 10)}`
    };
    
    createUserMutation.mutate(userData);
  };

  const handleUpdateUser = (userData) => {
    updateUserMutation.mutate({
      id: editingUser.id,
      data: userData
    });
  };

  const handleDeleteUser = (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleAssignEditor = (studentId, editorId) => {
    assignEditorMutation.mutate({ studentId, editorId });
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ role: '', search: '', isActive: '' });
  };

  const editors = users.filter(user => user.role === 'EDITOR');
  const students = users.filter(user => user.role === 'STUDENT');

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading users</h3>
              <p className="mt-1 text-sm text-red-700">{error.message}</p>
            </div>
          </div>
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
              {users.length} total users
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button onClick={() => setShowCreateForm(true)}>
              <PlusIcon className="h-5 w-5 mr-2" />
              Create User
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="STUDENT">Student</option>
                <option value="EDITOR">Editor</option>
                <option value="REVIEWER">Reviewer</option>
                <option value="ADMIN">Admin</option>
                <option value="SALES">Sales</option>
                <option value="OPERATIONS">Operations</option>
              </select>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                value={filters.isActive}
                onChange={(e) => handleFilterChange('isActive', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
              <Button variant="secondary" onClick={clearFilters}>
                <FunnelIcon className="h-4 w-4 mr-1" />
                Clear
              </Button>
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
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  placeholder="Enter full name"
                />
                
                <Input
                  label="Email"
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
                    Role
                  </label>
                  <select
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  >
                    <option value="STUDENT">Student</option>
                    <option value="EDITOR">Editor</option>
                    <option value="REVIEWER">Reviewer</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SALES">Sales</option>
                    <option value="OPERATIONS">Operations</option>
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

        {/* Users Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assignment
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-600">
                              {user.name?.charAt(0)?.toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                            {user.grade && (
                              <div className="text-xs text-gray-400">
                                {user.grade}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={clsx(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          getRoleColor(user.role)
                        )}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={clsx(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          user.isActive 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        )}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.role === 'STUDENT' && (
                          <div className="flex items-center space-x-2">
                            <select
                              className="text-xs border border-gray-300 rounded px-2 py-1"
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAssignEditor(user.id, e.target.value);
                                  e.target.value = "";
                                }
                              }}
                            >
                              <option value="">Assign Editor</option>
                              {editors.map(editor => (
                                <option key={editor.id} value={editor.id}>
                                  {editor.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {user.role === 'EDITOR' && (
                          <div className="text-xs text-gray-500">
                            {user.studentAssignments?.length || 0} students
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          {currentUser.id !== user.id && (
                            <button
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first user.
              </p>
              <div className="mt-6">
                <Button onClick={() => setShowCreateForm(true)}>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create User
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setEditingUser(null)} />
              
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Edit User</h3>
                    <button
                      onClick={() => setEditingUser(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const userData = {
                      name: formData.get('name'),
                      role: formData.get('role'),
                      isActive: formData.get('isActive') === 'true',
                      grade: formData.get('grade') || null,
                      parentEmail: formData.get('parentEmail') || null
                    };
                    handleUpdateUser(userData);
                  }} className="space-y-4">
                    <Input
                      label="Name"
                      name="name"
                      defaultValue={editingUser.name}
                      required
                    />
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <select
                        name="role"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        defaultValue={editingUser.role}
                      >
                        <option value="STUDENT">Student</option>
                        <option value="EDITOR">Editor</option>
                        <option value="REVIEWER">Reviewer</option>
                        <option value="ADMIN">Admin</option>
                        <option value="SALES">Sales</option>
                        <option value="OPERATIONS">Operations</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        name="isActive"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        defaultValue={editingUser.isActive.toString()}
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>

                    {editingUser.role === 'STUDENT' && (
                      <>
                        <Input
                          label="Grade"
                          name="grade"
                          defaultValue={editingUser.grade || ''}
                        />
                        <Input
                          label="Parent Email"
                          name="parentEmail"
                          type="email"
                          defaultValue={editingUser.parentEmail || ''}
                        />
                      </>
                    )}

                    <div className="flex space-x-3 pt-4">
                      <Button type="submit" disabled={updateUserMutation.isLoading}>
                        {updateUserMutation.isLoading ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Updating...
                          </>
                        ) : (
                          'Update User'
                        )}
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
