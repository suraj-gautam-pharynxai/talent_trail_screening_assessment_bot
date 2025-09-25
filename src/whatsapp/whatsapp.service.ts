import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Messages, MessageStatus } from './entities/messages.entity';
import { Room } from './entities/rooms.entity';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappService {

  private readonly accessToken: string;

  private readonly phoneNumberId: string;

  constructor(

    private configService: ConfigService,

    @InjectRepository(Messages)
    private messagesRepository: Repository<Messages>,

    @InjectRepository(Room)
    private roomsRepository: Repository<Room>,
  ) {
    this.accessToken = this.configService.get<string>('WHATSAPP_TOKEN')!;
    this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID')!;
  }
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



  async sendMessage(body: any, file?: Express.Multer.File) {
    let {
      to,
      type,
      templateName,
      language = 'en_US',
      parameters = [],
      message,
      caption,
      latitude,
      longitude,
      contacts,
      profileName,
      user = {},
    } = body;

    if (typeof user === 'string') {
      try {
        user = JSON.parse(user);
      } catch (e) {
        throw new InternalServerErrorException('Invalid user JSON string');
      }
    }

    console.log({ user })
    console.log("##########", typeof user)

    const recipientPhoneNumber = `91${to}`;

    let payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: "individual",
      to: recipientPhoneNumber,
      type,
    };

    const findRoom = await this.roomsRepository.findOne({
      where: { phoneNumber: to },
    });

    let room = findRoom;
    if (!room) {
      room = await this.roomsRepository.create({
        phoneNumber: to,
        profileName,

      });
    } else {
      room.lastActivityAt = new Date();
      room.profileName = profileName;
      await this.roomsRepository.save(room);
    }

    let uploadedMediaId: string | null = null;

    console.log({ file })
    if (file) {
      uploadedMediaId = await this.uploadMedia(file);
    }

    console.log({ uploadedMediaId })



    switch (type) {
      case 'text':
        payload.text = { body: message };
        break;

      case 'template':
        payload.template = {
          name: templateName,
          language: { code: language },
          components: [
            {
              type: 'body',
              parameters: parameters.map((param: string) => ({
                type: 'text',
                text: param,
              })),
            },
          ],
        };
        break;

      case 'image':
      case 'video':
      case 'document':
      case 'audio':
        if (!uploadedMediaId) throw new InternalServerErrorException('Media upload failed');
        payload[type] = {
          id: uploadedMediaId,
          ...(caption && { caption }),
        };
        break;

      case 'location':
        payload.location = {
          latitude,
          longitude,
          ...(caption && { name: caption }),
        };
        break;

      case 'contacts':
        payload.contacts = contacts;
        break;

      default:
        throw new InternalServerErrorException(`Unsupported message type: ${type}`);
    }

    const url = `https://graph.facebook.com/v23.0/${this.phoneNumberId}/messages`;

    try {
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const messageId = response.data?.messages?.[0]?.id;

      if (messageId) {
        await this.messagesRepository.save({
          whatsappMetaId: messageId,
          roomId: room.id,
          direction: 'outgoing',
          status: MessageStatus.SENT,
          phoneNumber: to,
          content: message ? `<p class="text-[1.4rem] text-gray-700">${message}</p>` : "",
          mediaId: uploadedMediaId || "",
          mediaCaption: caption,
          engagementId: user.engagementId || "",
          engagementUniqueId: user.engagementUniqueId || "",
          _id: user._id,
          customerId: user.customerId,
          remark: ""
        });
      }

      return response.data;
    } catch (error) {
      console.error('Message send failed:', error.response?.data || error);
      throw new InternalServerErrorException(
        error.response?.data || 'Failed to send message',
        error.response?.status || 500,
      );
    }
  },


  async uploadMedia(file: Express.Multer.File): Promise<string> {
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
      knownLength: file.size,
    });

    const url = `https://graph.facebook.com/v23.0/${this.phoneNumberId}/media`;

    try {
      const response = await axios.post(url, form, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          ...form.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      return response.data.id;
    } catch (error) {
      console.error('Upload media failed:', error.response?.data || error);
      throw new InternalServerErrorException('Failed to upload media');
    }
  }

}
