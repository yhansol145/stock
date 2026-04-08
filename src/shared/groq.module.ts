import { Module } from '@nestjs/common';
import { GroqService } from '../recommendation/services/groq.service';

@Module({
  providers: [GroqService],
  exports: [GroqService],
})
export class GroqModule {}
