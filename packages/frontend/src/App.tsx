import React, { useState, useEffect, useCallback } from 'react'; // Removed useRef
import axios from 'axios';


import { Job } from './types';
import './App.css';


const API_BASE_URL = '/api';

const SSE_URL = '/api/sse/events'; 

function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [inputString, setInputString] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);



  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Fetching initial jobs...');
      const response = await axios.get<Job[]>(`${API_BASE_URL}/jobs`);
      console.log('Jobs fetched:', response.data);
      setJobs(response.data || []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError('Failed to fetch job history.');
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!inputString.trim()) {
      setError('Input string cannot be empty.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      console.log('Submitting job with input:', inputString);
      
      await axios.post<Job>(`${API_BASE_URL}/jobs`, { inputString });
      console.log('Job submitted successfully via POST');
      setInputString('');
    } catch (err) {
      console.error('Error submitting job:', err);
      setError('Failed to submit job.');
    } finally {
      setIsLoading(false);
    }
  };



  useEffect(() => {
    fetchJobs();

    console.log(`Attempting to connect to SSE endpoint: ${SSE_URL}`);
    const eventSource = new EventSource(SSE_URL);

    eventSource.onopen = () => {
      console.log('SSE connection established.');
      setError(null); 
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      setError('Connection error with real-time updates.');

      eventSource.close();
    };

    
    eventSource.addEventListener('jobUpdate', (event) => {
      console.log('Raw jobUpdate event received via SSE:', event.data);
      try {
        const updatedJob: Job = JSON.parse(event.data);

        setJobs(currentJobs => {
          const index = currentJobs.findIndex(job => job.jobId === updatedJob.jobId);
          if (index !== -1) {
            // Update existing job
            return currentJobs.map(job =>
              job.jobId === updatedJob.jobId ? updatedJob : job
            );
          } else {
            // Add new job and sort
            return [updatedJob, ...currentJobs].sort((a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          }
        });
      } catch (parseError) {
        console.error('Failed to parse SSE jobUpdate data:', parseError);
      }
    });

    
    return () => {
      console.log('Closing SSE connection...');
      eventSource.close();
    };
  }, [fetchJobs]); // Depend on fetchJobs


  return (
    <div className="App">
      <h1>Real-Time Regex Validator</h1>


      <form onSubmit={handleSubmit}>
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
