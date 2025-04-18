import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { JobsModule } from './jobs/jobs.module';
import { KafkaModule } from './kafka/kafka.module';
import { SseModule } from './sse/sse.module'; 

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('mongodb.uri');
        Logger.log(`Connecting to MongoDB at ${uri}`, 'MongooseModule');
        return {
          uri: uri,
        };
      },
      inject: [ConfigService],
    }),
    JobsModule,
    KafkaModule,
    SseModule,
  ],
  controllers: [AppController],
  providers: [AppService, Logger],
})
export class AppModule {}
