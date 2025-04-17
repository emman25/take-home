import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum JobStatus {
  VALIDATING = 'Validating',
  VALID = 'Valid',
  INVALID = 'Invalid',
}

@Schema({ timestamps: true })
export class Job extends Document {
  @Prop({ type: String, default: () => uuidv4(), index: true, unique: true })
  jobId: string;

  @Prop({ required: true })
  inputString: string;

  @Prop({ required: true })
  regexPattern: string;

  @Prop({ required: true, enum: JobStatus, default: JobStatus.VALIDATING })
  status: JobStatus;

}

export const JobSchema = SchemaFactory.createForClass(Job);


JobSchema.index({ status: 1 });
