import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  readonly inputString: string;
}
