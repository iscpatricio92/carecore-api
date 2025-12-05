import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentReferenceEntity } from '../../entities/document-reference.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentReferenceEntity])],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
