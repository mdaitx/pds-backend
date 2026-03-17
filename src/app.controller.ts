/**
 * Controller raiz: rotas globais da API.
 *
 * health: usado por load balancers e monitoramento para verificar se a API está no ar.
 */
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** GET /health - indica que o serviço está respondendo (sem autenticação). */
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }
}
