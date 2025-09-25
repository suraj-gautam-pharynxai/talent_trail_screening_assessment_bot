import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',        // your DB host
      port: 5432,               // default Postgres port
      username: 'postgres',     // your DB username
      password: 'postgres',     // your DB password
      database: 'testdb',       // your DB name
      autoLoadEntities: true,   // auto load entities from modules
      synchronize: true,        // auto create DB schema (disable in prod!)
    }),
    WhatsappModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
