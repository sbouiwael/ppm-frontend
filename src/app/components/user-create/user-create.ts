/**
 * Composant de creation d'un nouvel utilisateur.
 * Affiche un formulaire reactif avec les champs nom, prenom, email,
 * role, capacite hebdomadaire, mot de passe et statut actif.
 */
import { Component, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';

import { HasUnsavedChanges } from '../../guards/unsaved-changes.guard';
import { UserService, CreateUserPayload } from '../../services/user-service';
import { Role } from '../../models/user';

@Component({
  selector: 'app-user-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './user-create.html',
  styleUrls: ['./user-create.css'],
})
export class UserCreate implements HasUnsavedChanges {
  /** Formulaire reactif de creation d'utilisateur */
  form: FormGroup;
  /** Message d'erreur */
  errorMessage = '';
  /** Indicateur de soumission en cours */
  loading = false;
  /** Indique si la creation a reussi — empeche le declenchement du guard apres sauvegarde */
  private savedSuccessfully = false;

  /** Liste des roles disponibles pour le selecteur */
  roles: Role[] = ['PM', 'PMO', 'DEV', 'QA', 'DEVOPS', 'RH', 'ADMIN'];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['DEV', Validators.required],
      weeklyCapacity: [0, [Validators.required, Validators.min(0)]],
      password: ['', [Validators.required, Validators.minLength(1)]],
      active: [true],
    });
  }

  /** HasUnsavedChanges : retourne true si le formulaire a ete modifie sans etre sauvegarde */
  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.savedSuccessfully;
  }

  /** Valide et soumet le formulaire pour creer l'utilisateur */
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const v = this.form.value;

    const payload: CreateUserPayload = {
      firstName: v.firstName,
      lastName: v.lastName,
      email: v.email,
      role: v.role,
      weeklyCapacity: Number(v.weeklyCapacity),
      password: v.password,
      active: !!v.active,
    };

    this.userService.createUser(payload).subscribe({
      next: () => {
        this.savedSuccessfully = true;
        this.router.navigateByUrl('/users');
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMessage = 'Error creating user';
        this.cdr.detectChanges();
      },
    });
  }
}
