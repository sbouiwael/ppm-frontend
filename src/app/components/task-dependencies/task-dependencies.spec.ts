import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';

import { TaskDependencies } from './task-dependencies';

describe('TaskDependencies', () => {
  let component: TaskDependencies;
  let fixture: ComponentFixture<TaskDependencies>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskDependencies],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskDependencies);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
