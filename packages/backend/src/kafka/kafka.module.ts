import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaConsumerService } from './kafka-consumer.service';
import { KafkaController } from './kafka.controller';
import { JobsModule } from '../jobs/jobs.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    ConfigModule,
    JobsModule,
    EventsModule,



    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => {
          const brokers = configService.get<string[]>('kafka.brokers', ['kafka:9092']);
          const clientId = configService.get<string>('kafka.clientId', 'regex-validator-backend-consumer');
          const groupId = configService.get<string>('kafka.groupId', 'regex-validator-group');
          Logger.log(`Registering Kafka client for Consumer: brokers=${brokers}, clientId=${clientId}, groupId=${groupId}`, 'KafkaModule');
          return {
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: clientId,
                brokers: brokers,
              },
              consumer: {
                groupId: groupId,
                allowAutoTopicCreation: true,
              },
            },
          };
        },
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [KafkaController],
  providers: [KafkaConsumerService, Logger],
})
export class KafkaModule {}
