import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TransCompletedPage } from './trans-completed.page';

describe('TransCompletedPage', () => {
  let component: TransCompletedPage;
  let fixture: ComponentFixture<TransCompletedPage>;

  beforeEach(async(() => {
    fixture = TestBed.createComponent(TransCompletedPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
