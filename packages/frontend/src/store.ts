import { create } from 'zustand';
import axios from 'axios';
import { Job } from './types'; 

const API_BASE_URL = '/api';

// Define the state structure and actions
interface AppState {
  jobs: Job[];
  inputString: string;
  isLoading: boolean;
  error: string | null;
  setInputString: (input: string) => void;
  fetchJobs: () => Promise<void>;
  submitJob: () => Promise<void>;
  
  _handleSseJobUpdate: (updatedJob: Job) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  jobs: [],
  inputString: '',
  isLoading: false,
  error: null,

  // Actions
  setInputString: (input) => set({ inputString: input }),

  fetchJobs: async () => {
    set({ isLoading: true, error: null });
    try {
      console.log('Fetching initial jobs (Zustand)...');
      const response = await axios.get<Job[]>(`${API_BASE_URL}/jobs`);
      console.log('Jobs fetched (Zustand):', response.data);
      // Sort jobs initially
      const sortedJobs = (response.data || []).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      set({ jobs: sortedJobs, isLoading: false });
    } catch (err) {
      console.error('Error fetching jobs (Zustand):', err);
      set({ error: 'Failed to fetch job history.', jobs: [], isLoading: false });
    }
  },

  submitJob: async () => {
    const inputString = get().inputString;
    if (!inputString.trim()) {
      set({ error: 'Input string cannot be empty.' });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      console.log('Submitting job (Zustand) with input:', inputString);
      const response = await axios.post<Job>(`${API_BASE_URL}/jobs`, { inputString });
      console.log('Job submitted successfully via POST (Zustand):', response.data);

     
      const newJobOptimistic: Job = {
        ...response.data,
        createdAt: new Date(response.data.createdAt).toISOString(),
        updatedAt: new Date(response.data.updatedAt).toISOString(),
      };
      set(state => ({
        jobs: [newJobOptimistic, ...state.jobs].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        inputString: '', // Clear input after successful submission
        isLoading: false
      }));
    } catch (err) {
      console.error('Error submitting job (Zustand):', err);
      set({ error: 'Failed to submit job.', isLoading: false });
    }
  },

  // Internal action called by SSE listener in the component
  _handleSseJobUpdate: (updatedJob) => {
    console.log('Handling SSE job update in store:', updatedJob.jobId);
    set(state => {
      const index = state.jobs.findIndex(job => job.jobId === updatedJob.jobId);
      if (index !== -1) {
        // Update existing job
        const newJobs = [...state.jobs]; // Shallow copy is fine here
        newJobs[index] = updatedJob;
        return { jobs: newJobs };
      } else {
        // Add new job and sort (should ideally be handled by optimistic update)
        console.warn(`Received SSE update for unknown job ID: ${updatedJob.jobId}. Adding.`);
        return {
          jobs: [updatedJob, ...state.jobs].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        };
      }
    });
  },
}));
