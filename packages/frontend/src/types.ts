export enum JobStatus {
    VALIDATING = 'Validating',
    VALID = 'Valid',
    INVALID = 'Invalid',
}

export interface Job {
    jobId: string;
    inputString: string;
    regexPattern: string;
    status: JobStatus;
    createdAt: string;
    updatedAt: string;
}
