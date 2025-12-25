import { TestBed } from '@angular/core/testing';

import { TransbankService } from './trans-bank.service';

describe('TransBankService', () => {
  let service: TransbankService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransbankService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
