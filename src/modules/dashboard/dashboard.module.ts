import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/auth/auth.module';
import { DashboardChartsCacheInvalidator } from './dashboard-charts-cache-invalidator.service';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardChartsCacheInvalidator],
  exports: [DashboardChartsCacheInvalidator],
})
export class DashboardModule {}
