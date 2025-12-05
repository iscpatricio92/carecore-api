import { Module } from '@nestjs/common';

import { PractitionersController } from './practitioners.controller';
import { PractitionersService } from './practitioners.service';

@Module({
  imports: [],
  controllers: [PractitionersController],
  providers: [PractitionersService],
  exports: [PractitionersService],
})
export class PractitionersModule {}
