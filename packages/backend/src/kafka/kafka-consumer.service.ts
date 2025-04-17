import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka, Ctx, KafkaContext, Payload } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { JobsService } from '../jobs/jobs.service';
import { JobStatus } from '../jobs/schemas/job.schema';
import { JobResponseDto } from '../jobs/dto/job-response.dto';
import { firstValueFrom } from 'rxjs';


interface JobSubmittedPayload {
  jobId: string;
  inputString: string;
  regexPattern: string;
  delayMs: number;
}


interface JobUpdatedPayload extends JobResponseDto {}

@Injectable()
export class KafkaConsumerService implements OnModuleInit {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private readonly jobSubmitTopic: string;
  private readonly jobUpdateTopic: string;

  constructor(
    private readonly jobsService: JobsService,
    private readonly configService: ConfigService,
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {
    this.jobSubmitTopic = this.configService.get<string>('kafka.jobSubmitTopic', 'job.submitted');
    this.jobUpdateTopic = this.configService.get<string>('kafka.jobUpdateTopic', 'job.updated');
  }

  async onModuleInit() {
    this.kafkaClient.subscribeToResponseOf(this.jobUpdateTopic);




  }



  async handleJobSubmitted(
    @Payload() payload: JobSubmittedPayload,
    @Ctx() context: KafkaContext,
  ) {
    const { jobId, inputString, regexPattern, delayMs } = payload;
    const topic = context.getTopic();
    const partition = context.getPartition();
    const offset = context.getMessage().offset;
    this.logger.log(`Received job ${jobId} from Kafka topic ${topic} [${partition}/${offset}]`);

    try {
      this.logger.log(`Job ${jobId}: Simulating validation delay of ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      this.logger.log(`Job ${jobId}: Delay complete. Validating...`);


      const regex = new RegExp(regexPattern);
      const isValid = regex.test(inputString);
      const finalStatus = isValid ? JobStatus.VALID : JobStatus.INVALID;
      this.logger.log(`Job ${jobId}: Validation result: ${finalStatus}`);


      const updatedJob = await this.jobsService.updateJobStatus(jobId, finalStatus);

      if (!updatedJob) {
        this.logger.error(`Job ${jobId}: Failed to update status in DB. Job not found.`);

        return;
      }


      const updatePayload: JobUpdatedPayload = new JobResponseDto(updatedJob);
      await firstValueFrom(
        this.kafkaClient.emit(this.jobUpdateTopic, updatePayload),
      );
      this.logger.log(`Job ${jobId}: Status update (${finalStatus}) sent to Kafka topic ${this.jobUpdateTopic}`);

    } catch (error) {
      this.logger.error(`Job ${jobId}: Error processing job:`, error);



    }
  }
}
