import React, { useState } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const NewSubmission = () => {
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle submission creation
    console.log('Creating submission:', formData);
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create New Submission</h1>
          <p className="text-gray-600">Submit your writing for AI analysis and review.</p>
        </div>
        
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Title"
                placeholder="Enter a title for your submission"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                </label>
                <textarea
                  rows={12}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Paste or type your writing here..."
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Minimum 50 characters required for analysis.
                </p>
              </div>
              
              <div className="flex space-x-3">
                <Button type="submit">Submit for Analysis</Button>
                <Button variant="secondary">Save as Draft</Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewSubmission;
