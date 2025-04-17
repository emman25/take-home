import { JobStatus } from '../schemas/job.schema';

export class JobResponseDto {
  jobId: string;
  inputString: string;
  regexPattern: string;
  status: JobStatus;
  createdAt: Date;
  updatedAt: Date;

  constructor(job: any) {
    this.jobId = job.jobId;
    this.inputString = job.inputString;
    this.regexPattern = job.regexPattern;
    this.status = job.status;
    this.createdAt = job.createdAt;
    this.updatedAt = job.updatedAt;
  }
}
