import { Injectable, BadRequestException } from '@nestjs/common';
import { KR_STOCKS, KrStock } from '../constants/kr-stocks.constant';

export interface SearchStocksResult {
  stocks: KrStock[];
  total: number;
}

@Injectable()
export class SearchStocksUseCase {
  execute(query: string): SearchStocksResult {
    let regex: RegExp;
    try {
      regex = new RegExp(query, 'i');
    } catch {
      throw new BadRequestException(`유효하지 않은 검색어입니다: ${query}`);
    }

    const stocks = KR_STOCKS.filter((s) => regex.test(s.name));

    return { stocks, total: stocks.length };
  }
}
