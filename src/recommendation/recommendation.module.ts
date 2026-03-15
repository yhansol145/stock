import { Module } from '@nestjs/common';
import { RecommendationController } from './recommendation.controller';
import { GroqService } from './services/groq.service';
import { GetRecommendationsUseCase } from './usecases/get-recommendations.usecase';
import { StockModule } from '../stock/stock.module';
import { NewsModule } from '../news/news.module';

@Module({
  imports: [StockModule, NewsModule],
  controllers: [RecommendationController],
  providers: [GroqService, GetRecommendationsUseCase],
})
export class RecommendationModule {}
