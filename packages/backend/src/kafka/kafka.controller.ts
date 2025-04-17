import { Controller, Logger, Inject } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { KafkaConsumerService } from './kafka-consumer.service';
import { EventsGateway } from '../events/events.gateway';
import { JobResponseDto } from '../jobs/dto/job-response.dto';

@Controller()
export class KafkaController {
  private readonly logger = new Logger(KafkaController.name);

  constructor(
    private readonly kafkaConsumerService: KafkaConsumerService,
    private readonly eventsGateway: EventsGateway,
  ) {}

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
    @Payload() data: JobResponseDto,
    @Ctx() context: KafkaContext,
  ) {
    const topic = context.getTopic();
    const partition = context.getPartition();
    const offset = context.getMessage().offset;
    this.logger.log(`KafkaController received job.updated event from ${topic} [${partition}/${offset}]: ${JSON.stringify(data)}`);
    this.eventsGateway.broadcastJobUpdate(data);
  }
}
