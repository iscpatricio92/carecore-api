import { Injectable } from '@nestjs/common';

@Injectable()
export class PatientsService {
  findAll() {
    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total: 0,
      entry: [],
    };
  }
}
