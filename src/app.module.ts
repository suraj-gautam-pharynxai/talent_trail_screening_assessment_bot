import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'dbpharynxai.centralindia.cloudapp.azure.com',
      port: 5432,
      username: 'admin',
      password: 'password',
      database: 'test',
      autoLoadEntities: true,
      synchronize: true,
    }),
    WhatsappModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
