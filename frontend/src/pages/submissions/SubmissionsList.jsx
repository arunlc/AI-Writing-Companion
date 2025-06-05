const SubmissionsList = () => {
  const { user } = useAuth();
  
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.role === 'STUDENT' ? 'My Submissions' : 'Submissions'}
          </h1>
        </div>
        
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No submissions</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first submission.
              </p>
              {user?.role === 'STUDENT' && (
                <div className="mt-6">
                  <Button>Create New Submission</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
