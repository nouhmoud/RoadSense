import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Eureka } from 'eureka-js-client';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Eureka Registration
  const client = new Eureka({
    instance: {
      app: 'roadsense-priority',
      hostName: 'roadsense-priority',
      ipAddr: '127.0.0.1',
      port: {
        '$': 3000,
        '@enabled': true,
      },
      vipAddress: 'roadsense-priority',
      dataCenterInfo: {
        '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
        name: 'MyOwn',
      },
    },
    eureka: {
      host: 'discovery-service',
      port: 8761,
      servicePath: '/eureka/apps/',
    },
  });
  client.start();

  app.enableCors(); // Enable CORS for frontend access
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
