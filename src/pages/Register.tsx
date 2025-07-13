import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Join RecovR
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Start your recovery journey today
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="crisis-alert">
              <p className="text-sm text-danger-800 dark:text-danger-200">{error}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="form-label dark:text-white">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="form-input dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label htmlFor="lastName" className="form-label dark:text-white">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="form-input dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="username" className="form-label dark:text-white">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="form-input dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="johndoe"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="email" className="form-label dark:text-white">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="form-input dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="form-label dark:text-white">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="form-input dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="form-label dark:text-white">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="form-input dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex justify-center py-2 px-4 disabled:opacity-50"
            >
              {isLoading ? <LoadingSpinner size="small" /> : 'Create Account'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-500">
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;