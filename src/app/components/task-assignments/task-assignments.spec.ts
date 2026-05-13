import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';

import { TaskAssignments } from './task-assignments';

describe('TaskAssignments', () => {
  let component: TaskAssignments;
  let fixture: ComponentFixture<TaskAssignments>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskAssignments],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskAssignments);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
