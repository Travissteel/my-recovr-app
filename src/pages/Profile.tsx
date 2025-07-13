import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Profile: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account settings and preferences
        </p>
      </div>
      
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Account Information
        </h2>
        <div className="space-y-4">
          <div>
            <label className="form-label dark:text-white">Name</label>
            <p className="text-gray-900 dark:text-gray-100">
              {user?.firstName} {user?.lastName}
            </p>
          </div>
          <div>
            <label className="form-label dark:text-white">Username</label>
            <p className="text-gray-900 dark:text-gray-100">{user?.username}</p>
          </div>
          <div>
            <label className="form-label dark:text-white">Email</label>
            <p className="text-gray-900 dark:text-gray-100">{user?.email}</p>
          </div>
          <div>
            <label className="form-label dark:text-white">Member Since</label>
            <p className="text-gray-900 dark:text-gray-100">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>
      
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Settings
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Profile settings and preferences are being developed.
        </p>
      </div>
    </div>
  );
};

export default Profile;