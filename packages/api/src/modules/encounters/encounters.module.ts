import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EncountersController } from './encounters.controller';
import { EncountersService } from './encounters.service';
import { EncounterEntity } from '../../entities/encounter.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EncounterEntity])],
  controllers: [EncountersController],
  providers: [EncountersService],
  exports: [EncountersService],
})
export class EncountersModule {}
