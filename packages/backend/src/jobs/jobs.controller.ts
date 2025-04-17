import { Controller, Post, Body, Get, Logger, ValidationPipe, UsePipes } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JobResponseDto } from './dto/job-response.dto';

@Controller('jobs')
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(@Body() createJobDto: CreateJobDto): Promise<JobResponseDto> {
    this.logger.log(`Received request to create job: ${JSON.stringify(createJobDto)}`);
    return this.jobsService.createJob(createJobDto);
  }

  @Get()
  async findAll(): Promise<JobResponseDto[]> {
    this.logger.log('Received request to fetch all jobs');
    return this.jobsService.findAllJobs();
  }
}
