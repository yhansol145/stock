import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { StockCacheService } from '../stock/services/stock-cache.service';

@Controller('cron')
export class CronController {
  constructor(private readonly stockCacheService: StockCacheService) {}

  /**
   * GET /cron/refresh
   * Vercel Cron Job이 30분마다 호출 — 주식 데이터 갱신
   * Authorization: Bearer {CRON_SECRET}
   */
  @Get('refresh')
  async refresh(@Headers('authorization') auth: string) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && auth !== `Bearer ${cronSecret}`) {
      throw new UnauthorizedException('Invalid cron secret');
    }
    await this.stockCacheService.refresh();
    return { ok: true, refreshedAt: new Date().toISOString() };
  }
}
