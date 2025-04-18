import { Controller, Logger, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common'; 
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config'; 
import { KafkaConsumerService } from './kafka-consumer.service';
import { JobResponseDto } from '../jobs/dto/job-response.dto';
import { createClient, RedisClientType } from 'redis'; 

@Controller()

export class KafkaController implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaController.name);
  private redisPublisher: RedisClientType | undefined;
  private readonly redisJobChannel: string;

  constructor(
    private readonly kafkaConsumerService: KafkaConsumerService,
    private readonly configService: ConfigService,
  ) {
      this.redisJobChannel = this.configService.get<string>('redis.jobChannel', 'job-updates');
  }

  async onModuleInit() {
    const redisHost = this.configService.get<string>('redis.host', 'redis');
    const redisPort = this.configService.get<number>('redis.port', 6379);
    const client = createClient({ url: `redis://${redisHost}:${redisPort}` });

    client.on('error', (err) => this.logger.error('Redis Publisher Client Error', err));

    try {
      await client.connect();
      this.redisPublisher = client as RedisClientType;
      this.logger.log(`Redis Publisher client connected successfully.`);
    } catch (err) {
      this.logger.error(`Failed to connect Redis Publisher client.`, err);
      this.redisPublisher = undefined;
    }
  }

  async onModuleDestroy() {
    if (this.redisPublisher?.isOpen) {
      await this.redisPublisher.quit();
      this.logger.log('Redis Publisher client disconnected.');
    }
  }

  @EventPattern('job.submitted')
  async handleJobSubmitted(
    @Payload() data: any,
    @Ctx() context: KafkaContext,
  ) {
    this.logger.log(`KafkaController received job.submitted event`);
    await this.kafkaConsumerService.handleJobSubmitted(data, context);
  }

  @EventPattern('job.updated')
  async handleJobUpdated(

    @Payload() data: Record<string, any>,
    @Ctx() context: KafkaContext,
  ) {
    const topic = context.getTopic();
    const partition = context.getPartition();
    const offset = context.getMessage().offset;
    this.logger.log(`KafkaController received job.updated event from ${topic} [${partition}/${offset}]`);

    if (!this.redisPublisher?.isOpen) {
        this.logger.error(`Redis Publisher not connected. Cannot publish job update for job ID: ${data?.jobId}`);
        return;
    }

    try {
        
        const message = JSON.stringify(data);
        await this.redisPublisher.publish(this.redisJobChannel, message);
        this.logger.log(`Published job update for job ID ${data?.jobId} to Redis channel '${this.redisJobChannel}'.`);
    } catch (err) {
        this.logger.error(`Failed to publish job update for job ID ${data?.jobId} to Redis.`, err);
    }
  }
}
