import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdiantamentosService } from './adiantamentos.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import type { AuthUser } from '../../core/auth/auth.service';
import { CriarAdiantamentoDto } from './dto/criar-adiantamento.dto';
import { AtualizarAdiantamentoDto } from './dto/atualizar-adiantamento.dto';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { BadRequestException } from '@nestjs/common';

const BUCKET = 'uploads';
const ADVANCE_PREFIX = 'advance-receipts';
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

@Controller('advances')
@UseGuards(JwtAuthGuard)
export class AdiantamentosController {
  constructor(
    private readonly adiantamentosService: AdiantamentosService,
    private readonly supabase: SupabaseService,
  ) {}

  @Get('trip/:tripId')
  async findByTrip(@CurrentUser() user: AuthUser, @Param('tripId') tripId: string) {
    return this.adiantamentosService.findByTrip(user, tripId);
  }

  @Get('driver/:driverId')
  async findByDriver(@CurrentUser() user: AuthUser, @Param('driverId') driverId: string) {
    return this.adiantamentosService.findByDriver(user, driverId);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_SIZE_BYTES } }))
  async uploadReceipt(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException('Tipo inválido. Use JPEG, PNG, WebP ou PDF.');
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('Arquivo muito grande. Máximo 5 MB.');
    }
    const ext =
      file.mimetype === 'application/pdf'
        ? 'pdf'
        : ['image/jpeg', 'image/jpg'].includes(file.mimetype)
          ? 'jpg'
          : file.mimetype === 'image/png'
            ? 'png'
            : 'webp';
    const storage = this.supabase.getStorage();
    const path = `${ADVANCE_PREFIX}/${user.id}/${Date.now()}.${ext}`;
    const { data, error } = await storage.from(BUCKET).upload(path, file.buffer, {
      contentType: file.mimetype || 'image/jpeg',
      upsert: true,
    });
    if (error) {
      throw new BadRequestException(error.message);
    }
    const { data: urlData } = storage.from(BUCKET).getPublicUrl(data.path);
    return { url: urlData.publicUrl };
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CriarAdiantamentoDto) {
    return this.adiantamentosService.create(user, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AtualizarAdiantamentoDto,
  ) {
    return this.adiantamentosService.update(user, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.adiantamentosService.remove(user, id);
  }
}
