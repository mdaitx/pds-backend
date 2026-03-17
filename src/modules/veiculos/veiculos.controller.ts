import {
  BadRequestException,
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
import { VeiculosService } from './veiculos.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import type { AuthUser } from '../../core/auth/auth.service';
import { Role } from '@prisma/client';
import { CriarVeiculoDto } from './dto/criar-veiculo.dto';
import { AtualizarVeiculoDto } from './dto/atualizar-veiculo.dto';
import { SupabaseService } from '../../core/supabase/supabase.service';

const BUCKET = 'uploads';
const VEHICLE_PREFIX = 'vehicles';
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VeiculosController {
  constructor(
    private readonly veiculosService: VeiculosService,
    private readonly supabase: SupabaseService,
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async findAll(@CurrentUser() user: AuthUser) {
    return this.veiculosService.findAll(user);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.veiculosService.findOne(user, id);
  }

  @Post('upload')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_SIZE_BYTES } }))
  async uploadPhoto(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file?.buffer) {
      return { url: null };
    }
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de arquivo inválido. Use JPEG, PNG ou WebP.');
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('Arquivo muito grande. Máximo 5 MB.');
    }
    const ext = ['image/jpeg', 'image/jpg'].includes(file.mimetype) ? 'jpg' : file.mimetype === 'image/png' ? 'png' : 'webp';
    const storage = this.supabase.getStorage();
    const path = `${VEHICLE_PREFIX}/${user.id}/${Date.now()}.${ext}`;
    const { data, error } = await storage.from(BUCKET).upload(path, file.buffer, {
      contentType: file.mimetype || 'image/jpeg',
      upsert: true,
    });
    if (error) {
      throw new Error(error.message);
    }
    const { data: urlData } = storage.from(BUCKET).getPublicUrl(data.path);
    return { url: urlData.publicUrl };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async create(@CurrentUser() user: AuthUser, @Body() dto: CriarVeiculoDto) {
    return this.veiculosService.create(user, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AtualizarVeiculoDto,
  ) {
    return this.veiculosService.update(user, id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.veiculosService.remove(user, id);
  }
}
