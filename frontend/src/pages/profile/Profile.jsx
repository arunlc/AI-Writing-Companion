import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { UserIcon } from '@heroicons/react/24/outline';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    grade: user?.grade || '',
    parentEmail: user?.parentEmail || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateUser(formData);
    setIsEditing(false);
  };

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-900">Profile Settings</h1>
          </div>
          <div className="p-6">
            <div className="flex items-center mb-6">
              <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                <UserIcon className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900">{user?.name}</h2>
                <p className="text-sm text-gray-500">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                disabled={!isEditing}
              />
              <Input
                label="Email"
                value={formData.email}
                disabled
              />
              {user?.role === 'STUDENT' && (
                <>
                  <Input
                    label="Grade/Class"
                    value={formData.grade}
                    onChange={(e) => setFormData({...formData, grade: e.target.value})}
                    disabled={!isEditing}
                  />
                  <Input
                    label="Parent Email"
                    value={formData.parentEmail}
                    onChange={(e) => setFormData({...formData, parentEmail: e.target.value})}
                    disabled={!isEditing}
                  />
                </>
              )}
              
              <div className="flex space-x-3">
                {isEditing ? (
                  <>
                    <Button type="submit">Save Changes</Button>
                    <Button variant="secondary" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
