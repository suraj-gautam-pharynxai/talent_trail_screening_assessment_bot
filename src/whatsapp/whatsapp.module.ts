import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Messages } from './entities/messages.entity';
import { Room } from './entities/rooms.entity';

@Module({
  imports: [

    // Import TypeORM repositories
    TypeOrmModule.forFeature([Messages, Room]),
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService],
})
export class WhatsappModule { }
