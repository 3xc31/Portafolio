import { TestBed } from '@angular/core/testing';

import { ProductsFirebaseService } from './products-firebase.service';

describe('ProductsFirebaseService', () => {
  let service: ProductsFirebaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProductsFirebaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
