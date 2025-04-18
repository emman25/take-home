import { Module } from '@nestjs/common';
import { SseController } from './sse.controller';
import { ConfigModule } from '@nestjs/config'; 

@Module({
  imports: [ConfigModule], 
  controllers: [SseController],
})
export class SseModule {}
