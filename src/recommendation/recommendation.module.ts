import { Module } from '@nestjs/common';
import { RecommendationController } from './recommendation.controller';
import { GetRecommendationsUseCase } from './usecases/get-recommendations.usecase';
import { StockModule } from '../stock/stock.module';
import { NewsModule } from '../news/news.module';
import { GroqModule } from '../shared/groq.module';

@Module({
  imports: [StockModule, NewsModule, GroqModule],
  controllers: [RecommendationController],
  providers: [GetRecommendationsUseCase],
})
export class RecommendationModule {}
