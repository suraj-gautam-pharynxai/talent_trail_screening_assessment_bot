import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateWhatsappDto } from './dto/create-whatsapp.dto';
import { UpdateWhatsappDto } from './dto/update-whatsapp.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Messages, MessageStatus } from './entities/messages.entity';
import { Room } from './entities/rooms.entity';
import { Repository } from 'typeorm';

@Injectable()
export class WhatsappService {

  constructor(
    @InjectRepository(Messages)
    private messagesRepository: Repository<Messages>,

    @InjectRepository(Room)
    private roomsRepository: Repository<Room>,
  ) { }
  async processMessages(body: any) {
    try {
      const phoneNumberId = body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

      if (phoneNumberId === process.env.WHATSAPP_PHONE_NUMBER_ID) {

        const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.interactive?.button_reply?.title || body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.interactive?.list_reply?.title || null;
        const phoneNumberFrom = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0].from;
        const status = body.entry?.[0]?.changes?.[0]?.value?.statuses?.[0]?.status;
        const id = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id || body.entry?.[0]?.changes?.[0]?.value?.statuses?.[0]?.id;
        const errorMessage = body.entry?.[0]?.changes?.[0]?.value?.statuses?.[0]?.errors?.[0].message || "";
        const mediaId = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.image?.id || body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.video?.id || body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.audio?.id;
        const mediaCap = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.image?.caption || body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.video?.caption || body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.audio?.caption;

        console.log({ message, mediaCap, mediaId })

        let room = await this.roomsRepository.findOne({
          where: { phoneNumber: phoneNumberFrom?.slice(-10) }
        });

        if (message || mediaId || mediaCap) {
          const findMessage = await this.messagesRepository.findOne({
            where: { whatsappMetaId: id },
          });

          if (!findMessage) {


            // Create room if it doesn't exist
            if (!room) {
              room = await this.roomsRepository.create({
                phoneNumber: phoneNumberFrom?.slice(-10),
                lastActivityAt: new Date()
              });
            }

            await this.messagesRepository.save({
              whatsappMetaId: id,
              roomId: room.id,
              direction: 'incoming',
              status: MessageStatus.SENT,
              phoneNumber: phoneNumberFrom?.slice(-10),
              content: message || "",
              mediaId: mediaId,
              mediaCaption: mediaCap
            });

          }
        }

        if (status) {
          const messageToUpdate = await this.messagesRepository.findOne({ where: { whatsappMetaId: id } });
          if (messageToUpdate) {
            messageToUpdate.status = status;
            messageToUpdate.remark = errorMessage;
            await this.messagesRepository.save(messageToUpdate);
          }
        }
      }
    } catch (error) {
      console.error({ error })
      throw new InternalServerErrorException(error.message)
    }
  }


}
