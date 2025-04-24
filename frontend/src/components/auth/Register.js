import React, { useState } from 'react';

const Register = ({ onRegister }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    grade: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await onRegister(formData);
    } catch (error) {
      setError(error.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  const gradeOptions = [
    '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade',
    '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade',
    '11th Grade', '12th Grade'
  ];
  
  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6">Create Account</h2>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="name">
            Full Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            className="w-full p-2 border rounded"
            required
            value={formData.name}
            onChange={handleChange}
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="email">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            className="w-full p-2 border rounded"
            required
            value={formData.email}
            onChange={handleChange}
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="password">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            className="w-full p-2 border rounded"
            required
            minLength="6"
            value={formData.password}
            onChange={handleChange}
          />
          <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 mb-2" htmlFor="grade">
            Grade Level
          </label>
          <select
            id="grade"
            name="grade"
            className="w-full p-2 border rounded"
            value={formData.grade}
            onChange={handleChange}
          >
            <option value="">Select Grade Level</option>
            {gradeOptions.map(grade => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>
        </div>
        
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 disabled:bg-indigo-300"
          disabled={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>
    </div>
  );
};

export default Register;
