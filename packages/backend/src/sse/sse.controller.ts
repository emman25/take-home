import { Controller, Sse, MessageEvent, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject, fromEvent, map } from 'rxjs';
import { createClient, RedisClientType } from 'redis';
import { JobResponseDto } from '../jobs/dto/job-response.dto';

@Controller('sse') 
export class SseController implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SseController.name);
  private redisSubscriber: RedisClientType | undefined;
  private readonly redisJobChannel: string;
  
  private eventSubject = new Subject<MessageEvent>();

  constructor(private readonly configService: ConfigService) {
    this.redisJobChannel = this.configService.get<string>('redis.jobChannel', 'job-updates');
  }

  async onModuleInit() {
    const redisHost = this.configService.get<string>('redis.host', 'redis');
    const redisPort = this.configService.get<number>('redis.port', 6379);
    const subscriber = createClient({ url: `redis://${redisHost}:${redisPort}` });

    subscriber.on('error', (err) => this.logger.error('SSE Redis Subscriber Client Error', err));

    try {
      await subscriber.connect();
      this.redisSubscriber = subscriber as RedisClientType;
      this.logger.log(`SSE Redis Subscriber client connected successfully.`);

      
      await this.redisSubscriber.subscribe(this.redisJobChannel, (message) => {
        this.logger.log(`SSE received message from Redis channel '${this.redisJobChannel}'`);
        try {
          // Parse and push the message to the Subject
          const jobUpdate: JobResponseDto = JSON.parse(message);
          
          this.eventSubject.next({ data: jobUpdate, type: 'jobUpdate' }); // Send typed event
        } catch (parseError) {
          this.logger.error('SSE failed to parse message received from Redis:', parseError);
        }
      });
      this.logger.log(`SSE subscribed to Redis channel '${this.redisJobChannel}'.`);

    } catch (err) {
      this.logger.error(`SSE failed to connect or subscribe Redis Subscriber client.`, err);
      this.redisSubscriber = undefined;
    }
  }

  async onModuleDestroy() {
    if (this.redisSubscriber?.isOpen) {
      try {
        await this.redisSubscriber.unsubscribe(this.redisJobChannel);
        await this.redisSubscriber.quit();
        this.logger.log('SSE Redis Subscriber client unsubscribed and disconnected.');
      } catch(err) {
        this.logger.error('Error during SSE Redis subscriber cleanup:', err);
      }
    }
  }

  @Sse('events')
  handleSse(): Observable<MessageEvent> {
    this.logger.log('Client connected to SSE endpoint /sse/events');

    return this.eventSubject.asObservable();
  }
}
