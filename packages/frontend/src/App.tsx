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

      const newJobOptimistic: Job = {
        ...response.data,
        createdAt: new Date(response.data.createdAt).toISOString(),
        updatedAt: new Date(response.data.updatedAt).toISOString(),
      };

      setJobs(prevJobs => [newJobOptimistic, ...prevJobs].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));

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


    console.log('Attempting to connect WebSocket...${}');
    console.log(WEBSOCKET_URL)
    const newSocket = io({
      path: '/socket.io/',
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
    });
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('WebSocket connected:', newSocket.id);
      setError(null);

      newSocket.emit('messageToServer', { message: 'Hello from client' });
  

      // Add listener for the test event
      newSocket.on('testEvent', (data: { message: string }) => {
        console.log('*** Received testEvent from server ***:', data);
      });

      newSocket.on('jobUpdate', (updatedJob: Job) => {
        console.log('Raw jobUpdate event received:', updatedJob);

        setJobs(currentJobs => {
          const finalUpdatedJob: Job = {
              ...updatedJob,
              createdAt: new Date(updatedJob.createdAt).toISOString(),
              updatedAt: new Date(updatedJob.updatedAt).toISOString(),
          };
          const index = currentJobs.findIndex(job => job.jobId === finalUpdatedJob.jobId);
          if (index !== -1) {
            return currentJobs.map(job =>
              job.jobId === finalUpdatedJob.jobId ? finalUpdatedJob : job
            );
          } else {
            return [finalUpdatedJob, ...currentJobs].sort((a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          }
        });
      });
     
    });

    newSocket.on('disconnect', (reason: string) => {
      console.error('*** WebSocket Disconnected *** Reason:', reason);
      setError('WebSocket disconnected. Attempting to reconnect...');
    });

    newSocket.on('connect_error', (err: { message: any; description: any; stack: any; }) => {
      console.error('Socket.IO connection error details:', {
        message: err.message,
        description: err.description,
        stack: err.stack
      });
    });

    return () => {
      const socket = socketRef.current;
      if (socket) {
        console.log('Cleaning up WebSocket connection:', socket.id);

        socket.off('testEvent'); // Remove test listener on cleanup
        socket.off('jobUpdate');
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.disconnect();
      }
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
                {/* Add check for valid date before formatting */}
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
