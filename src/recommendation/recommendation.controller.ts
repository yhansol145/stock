import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { GetRecommendationsUseCase } from './usecases/get-recommendations.usecase';

@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly getRecommendationsUseCase: GetRecommendationsUseCase) {}

  @Get()
  async getRecommendations() {
    try {
      return await this.getRecommendationsUseCase.execute();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '추천 생성에 실패했습니다.';
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
