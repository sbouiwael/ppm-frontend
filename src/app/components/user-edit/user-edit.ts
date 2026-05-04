/**
 * Composant d'edition d'un utilisateur existant.
 * Charge les donnees de l'utilisateur, pre-remplit le formulaire,
 * et permet de mettre a jour les informations (y compris le mot de passe
 * uniquement s'il est saisi).
 */
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { HasUnsavedChanges } from '../../guards/unsaved-changes.guard';
import { UserService, UpdateUserPayload } from '../../services/user-service';
import { Role } from '../../models/user';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './user-edit.html',
  styleUrls: ['./user-edit.css'],
})
export class UserEdit implements OnInit, HasUnsavedChanges {
  /** Formulaire reactif d'edition */
  form: FormGroup;
  /** Message d'erreur */
  errorMessage = '';
  /** Indicateur de soumission en cours */
  loading = false;
  /** Indicateur de chargement initial des donnees */
  loadingData = true;
  /** Identifiant de l'utilisateur en cours d'edition */
  userId!: number;
  /** Indique si la modification a reussi — empeche le declenchement du guard apres sauvegarde */
  private savedSuccessfully = false;

  /** Liste des roles disponibles */
  roles: Role[] = ['PM', 'PMO', 'DEV', 'QA', 'DEVOPS', 'RH', 'ADMIN'];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['DEV', Validators.required],
      weeklyCapacity: [0, [Validators.required, Validators.min(0)]],
      password: [''],
      active: [true],
    });
  }

  /** Charge les donnees de l'utilisateur et pre-remplit le formulaire */
  ngOnInit(): void {
    this.userId = Number(this.route.snapshot.paramMap.get('id'));

    this.userService.getUserById(this.userId).subscribe({
      next: (user) => {
        this.loadingData = false;
        this.cdr.detectChanges();

        this.form.patchValue({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          weeklyCapacity: user.weeklyCapacity,
          active: user.active ?? true,
          password: '',
        });
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.loadingData = false;
        this.errorMessage = 'Error loading user data';
        this.cdr.detectChanges();
      },
    });
  }

  /** HasUnsavedChanges : retourne true si le formulaire a ete modifie sans etre sauvegarde */
  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.savedSuccessfully;
  }

  /** Valide et soumet le formulaire de mise a jour de l'utilisateur */
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const v = this.form.value;

    const payload: UpdateUserPayload = {
      firstName: v.firstName,
      lastName: v.lastName,
      email: v.email,
      role: v.role,
      weeklyCapacity: Number(v.weeklyCapacity),
      active: !!v.active,
    };

    // Only include password if user typed a new one
    if (v.password && v.password.trim()) {
      payload.password = v.password;
    }

    this.userService.updateUser(this.userId, payload).subscribe({
      next: () => { this.savedSuccessfully = true; this.router.navigateByUrl('/users'); },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMessage = 'Error updating user';
      },
    });
  }
}
