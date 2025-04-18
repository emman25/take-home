import React, { useEffect } from 'react';
import { useAppStore } from './store'; 
import { Job } from './types';
import './App.css';

const SSE_URL = '/api/sse/events';

function App() {
  const {
    jobs,
    inputString,
    isLoading,
    error,
    setInputString,
    fetchJobs,
    submitJob,
    _handleSseJobUpdate
  } = useAppStore();


  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    submitJob(); 
  };

  useEffect(() => {
    fetchJobs();

    console.log(`Attempting to connect to SSE endpoint: ${SSE_URL}`);
    const eventSource = new EventSource(SSE_URL);

    eventSource.onopen = () => {
      console.log('SSE connection established.');
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      eventSource.close();
    };

    eventSource.addEventListener('jobUpdate', (event) => {
      console.log('Raw jobUpdate event received via SSE:', event.data);
      try {
        const updatedJob: Job = JSON.parse(event.data);
        
        _handleSseJobUpdate(updatedJob);
      } catch (parseError) {
        console.error('Failed to parse SSE jobUpdate data:', parseError);
      }
    });

  
    return () => {
      console.log('Closing SSE connection...');
      eventSource.close();
    };
  }, [fetchJobs, _handleSseJobUpdate]);


  return (
    <div className="App">
      <h1>Real-Time Regex Validator</h1>


      <form onSubmit={handleFormSubmit}>
        <input
          type="text"
          value={inputString}
          onChange={(e) => setInputString(e.target.value)}
          placeholder="Enter string to validate"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Submitting...' : 'Submit'}
        </button>
      </form>

      {error && <p className="error">Error: {error}</p>}

      <h2>Job History</h2>
      {isLoading && jobs.length === 0 && <p>Loading job history...</p>}
      {!isLoading && jobs.length === 0 && !error && <p>No jobs submitted yet.</p>}

      {jobs.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Input String</th>
              <th>Regex Pattern</th>
              <th>Status</th>
              <th>Submitted At</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.jobId}>
                <td>{job.jobId.substring(0, 8)}...</td>
                <td>{job.inputString}</td>
                <td>{job.regexPattern}</td>
                <td className={`status-${job.status.toLowerCase()}`}>{job.status}</td>
                <td>{job.createdAt ? new Date(job.createdAt).toLocaleString() : 'N/A'}</td>
                <td>{job.updatedAt ? new Date(job.updatedAt).toLocaleString() : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
