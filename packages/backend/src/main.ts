import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = app.get(Logger);


  const httpPort = configService.get<number>('port', 3000);
  const kafkaBrokers = configService.get<string[]>('kafka.brokers', ['kafka:9092']);
  const kafkaGroupId = configService.get<string>('kafka.groupId', 'regex-validator-group');


  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));


  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });


  await app.listen(httpPort);
  logger.log(`HTTP server listening on port ${httpPort}`, 'Bootstrap');


  const kafkaApp = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: kafkaBrokers,
        },
        consumer: {
          groupId: kafkaGroupId,
        },
      },
    },
  );


  await kafkaApp.listen();
  logger.log(`Kafka consumer connected to brokers: ${kafkaBrokers.join(',')} with group ID: ${kafkaGroupId}`, 'Bootstrap');
}
bootstrap();
