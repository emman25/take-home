import { Module, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { Job, JobSchema } from './schemas/job.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => {
          const brokers = configService.get<string[]>('kafka.brokers', ['kafka:9092']);
          const clientId = configService.get<string>('kafka.clientId', 'regex-validator-backend');
          const groupId = configService.get<string>('kafka.groupId', 'regex-validator-group');
          Logger.log(`Registering Kafka client: brokers=${brokers}, clientId=${clientId}, groupId=${groupId}`, 'JobsModule');
          return {
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: clientId,
                brokers: brokers,
              },
              consumer: {
                groupId: groupId,
              },

            },
          };
        },
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [JobsController],
  providers: [JobsService, Logger],
  exports: [JobsService],
})
export class JobsModule {}
