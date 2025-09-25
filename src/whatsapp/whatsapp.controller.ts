import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Query, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { FileInterceptor } from '@nestjs/platform-express';
const util = require('util');

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) { }

  @Get('webhook')
  verifyWebhook(@Query() query: any, @Res() res: any): any {
    console.log("webhook test")
    const { 'hub.mode': mode, 'hub.verify_token': verifyToken, 'hub.challenge': challenge } = query;
    if (mode === 'subscribe' && (verifyToken === process.env.FACEBOOK_VERIFY_TOKEN || "tokenkey")) {
      return res.send(challenge);
    } else {
      return res.status(HttpStatus.BAD_REQUEST);
    }
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleFacebookWebhook(
    @Body() body: any,
    @Headers('x-hub-signature') signature: string,
    @Res() res: any
  ) {
    console.log('Facebook request body:', util.inspect(body, { showHidden: false, depth: null, colors: true }));
    const data = await this.whatsappService.processMessages(body)
    return res.status(HttpStatus.OK);
  }


  @Post('send-message')
  @UseInterceptors(FileInterceptor('file'))
  async sendMessage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Req() req: Request,
  ) {
    console.log("send message", body, file)
    return this.whatsappService.sendMessage(body, file);
  }



  // @Post('send-template')
  // @JwtAuth()
  // async sendATemplateMessage(@Body() body: any) {
  //   return this.whatsappService.sendATemplateMessage(body);
  // }
}
