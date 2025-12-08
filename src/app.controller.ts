import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import * as kuromoji from 'kuromoji';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  async getHello(): Promise<any> {
    kuromoji.builder({ dicPath: "/Users/ggj-trungpham/per-proj/test-app/dict" }).build(function (err, tokenizer) {
      // tokenizer is ready
      var path = tokenizer.tokenize("実践型指標トレード「カタリストテンペスト」");
      console.log("実践型指標トレード「カタリストテンペスト」 => ", path.map(item => item.surface_form));
      console.log("--------------------------------");
      
      var path = tokenizer.tokenize("「カタリストテンペスト」");
      console.log("「カタリストテンペスト」=> ", path.map(item => item.surface_form));
      console.log("--------------------------------");
      
      var path = tokenizer.tokenize("カタリストテンペスト");
      console.log("カタリストテンペスト=> ", path.map(item => item.surface_form));
  });
    return 'Complete';
  }

  @Post('test')
  async test(@Body() body: any): Promise<any> {
    console.log(body);
    return body.challenge
  }

}
