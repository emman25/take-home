import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JobResponseDto } from '../jobs/dto/job-response.dto';


@WebSocketGateway({
  cors: {
    origin: '*',
  },

})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventsGateway.name);

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');

  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);

  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

  }


  broadcastJobUpdate(jobUpdate: JobResponseDto) {
    this.logger.log(`Broadcasting job update for job ID: ${jobUpdate.jobId}`);
    this.server.emit('jobUpdate', jobUpdate);
  }


  @SubscribeMessage('messageToServer')
  handleMessage(client: Socket, payload: any): string {
    this.logger.log(`Received message from ${client.id}: ${JSON.stringify(payload)}`);

    return 'Message received!';
  }
}
