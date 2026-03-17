import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import * as express from 'express';
import { IncomingMessage, ServerResponse } from 'http';

const server = express();

let appPromise: Promise<void> | null = null;

function getApp(): Promise<void> {
  if (!appPromise) {
    appPromise = NestFactory.create(AppModule, new ExpressAdapter(server), {
      logger: ['error', 'warn'],
    }).then(async (app) => {
      app.enableCors();
      await app.init();
    });
  }
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await getApp();
  server(req, res);
}
