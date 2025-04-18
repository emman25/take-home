import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Logger } from '@nestjs/common'; 

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;
  private readonly logger = new Logger(RedisIoAdapter.name); // Initialize Logger

  async connectToRedis(redisHost: string, redisPort: number): Promise<void> {
    this.logger.log(`Connecting to Redis at ${redisHost}:${redisPort}`);
    const pubClient = createClient({ url: `redis://${redisHost}:${redisPort}` });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.logger.log('Successfully connected Redis pub/sub clients.');

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    if (!this.adapterConstructor) {
      this.logger.error('Redis adapter not initialized. Call connectToRedis first.');
      
      return super.createIOServer(port, options);
    }

    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    this.logger.log('Socket.IO server configured with Redis adapter.');
    return server;
  }
}
