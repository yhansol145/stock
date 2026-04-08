import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { GNewsService } from './services/gnews.service';
import { GetNewsUseCase } from './usecases/get-news.usecase';
import { TranslateNewsUseCase } from './usecases/translate-news.usecase';
import { GroqModule } from '../shared/groq.module';

@Module({
  imports: [GroqModule],
  controllers: [NewsController],
  providers: [GNewsService, GetNewsUseCase, TranslateNewsUseCase],
  exports: [GNewsService],
})
export class NewsModule {}
