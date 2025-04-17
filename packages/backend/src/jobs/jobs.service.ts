import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { Job, JobStatus } from './schemas/job.schema';
import { CreateJobDto } from './dto/create-job.dto';
import { JobResponseDto } from './dto/job-response.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);
  private readonly regexPattern: string;
  private readonly validationDelayMs: number;
  private readonly jobSubmitTopic: string;

  constructor(
    @InjectModel(Job.name) private jobModel: Model<Job>,
    private readonly configService: ConfigService,
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {
    this.regexPattern = this.configService.get<string>('regexPattern', '^[a-zA-Z0-9\\s]+$');
    this.validationDelayMs = this.configService.get<number>('validationDelayMs', 5000);
    this.jobSubmitTopic = this.configService.get<string>('kafka.jobSubmitTopic', 'job.submitted');

    this.logger.log(`Using Regex Pattern: ${this.regexPattern}`);
    this.logger.log(`Validation Delay: ${this.validationDelayMs}ms`);
  }

  async onModuleInit() {
    this.kafkaClient.subscribeToResponseOf(this.jobSubmitTopic);


    try {
      await this.kafkaClient.connect();
      this.logger.log('Kafka client connected successfully.');
    } catch (error) {
      this.logger.error('Failed to connect Kafka client:', error);
    }
  }

  async createJob(createJobDto: CreateJobDto): Promise<JobResponseDto> {
    this.logger.log(`Creating job for input: ${createJobDto.inputString}`);
    const newJob = new this.jobModel({
      inputString: createJobDto.inputString,
      regexPattern: this.regexPattern,
      status: JobStatus.VALIDATING,
    });

    const savedJob = await newJob.save();
    this.logger.log(`Job created with ID: ${savedJob.jobId}`);


    try {
      await firstValueFrom(
        this.kafkaClient.emit(this.jobSubmitTopic, {
          jobId: savedJob.jobId,
          inputString: savedJob.inputString,
          regexPattern: savedJob.regexPattern,
          delayMs: this.validationDelayMs,
        }),
      );
      this.logger.log(`Job ${savedJob.jobId} sent to Kafka topic ${this.jobSubmitTopic}`);
    } catch (error) {
      this.logger.error(`Failed to send job ${savedJob.jobId} to Kafka:`, error);


    }

    return new JobResponseDto(savedJob);
  }

  async findAllJobs(): Promise<JobResponseDto[]> {
    this.logger.log('Fetching all jobs');
    const jobs = await this.jobModel.find().sort({ createdAt: -1 }).exec();
    return jobs.map((job) => new JobResponseDto(job));
  }

  async findJobById(jobId: string): Promise<Job | null> {
    this.logger.log(`Finding job by ID: ${jobId}`);
    return this.jobModel.findOne({ jobId: jobId }).exec();
  }

  async updateJobStatus(jobId: string, status: JobStatus): Promise<Job | null> {
    this.logger.log(`Updating job ${jobId} status to ${status}`);
    const updatedJob = await this.jobModel.findOneAndUpdate(
      { jobId: jobId },
      { status: status },
      { new: true },
    ).exec();

    if (!updatedJob) {
      this.logger.warn(`Job ${jobId} not found for status update.`);
      return null;
    }

    this.logger.log(`Job ${jobId} status updated successfully.`);

    return updatedJob;
  }
}
