import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConsentsController } from './consents.controller';
import { ConsentsService } from './consents.service';
import { ConsentEntity } from '../../entities/consent.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConsentEntity, PatientEntity]),
    AuthModule, // Import AuthModule to use ScopePermissionService
    CommonModule, // Import CommonModule to use PatientContextService
  ],
  controllers: [ConsentsController],
  providers: [ConsentsService],
  exports: [ConsentsService],
})
export class ConsentsModule {}
