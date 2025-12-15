import { Module } from '@nestjs/common';

import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

@Module({
  imports: [],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
