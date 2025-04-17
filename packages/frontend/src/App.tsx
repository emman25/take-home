import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';


import { Job } from './types';
import './App.css';


const API_BASE_URL = '/api';
const WEBSOCKET_URL = '/';

function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [inputString, setInputString] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<any | null>(null);


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
      const response = await axios.post<Job>(`${API_BASE_URL}/jobs`, { inputString });
      console.log('Job submitted successfully:', response.data);



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


    console.log('Attempting to connect WebSocket...');
    const newSocket = io(WEBSOCKET_URL, {

    });
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('WebSocket connected:', newSocket.id);
    });


    newSocket.on('disconnect', (reason: string) => {
      console.log('WebSocket disconnected:', reason);

    });

    newSocket.on('connect_error', (err: Error) => {
        console.error('WebSocket connection error:', err.message);
        setError('WebSocket connection failed. Real-time updates may not work.');
    });


    newSocket.on('jobUpdate', (updatedJob: Job) => {
      console.log('Received jobUpdate event:', updatedJob);
      setJobs(prevJobs => {
        const existingJobIndex = prevJobs.findIndex(job => job.jobId === updatedJob.jobId);
        if (existingJobIndex !== -1) {

          const newJobs = [...prevJobs];
          newJobs[existingJobIndex] = updatedJob;
          return newJobs;
        } else {


          return [updatedJob, ...prevJobs].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
      });
    });


    return () => {
      console.log('Disconnecting WebSocket...');
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [fetchJobs]);


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
                <td>{new Date(job.createdAt).toLocaleString()}</td>
                <td>{new Date(job.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
