/**
 * Composant de la page de connexion.
 * Affiche un formulaire email/mot de passe, envoie la requete d'authentification
 * via AuthService, puis redirige l'utilisateur vers la page appropriee
 * en fonction de son role (ADMIN, PMO, PM, RH, DEV, QA, DEVOPS).
 */
import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  /** Formulaire reactif de connexion */
  form: FormGroup;
  /** Indicateur de chargement pendant la requete de connexion */
  loading = false;
  /** Message d'erreur affiche en cas d'echec de connexion */
  errorMsg = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    // Si deja connecte, rediriger directement vers l'accueil
    if (this.authService.isLoggedIn) {
      this.router.navigateByUrl('/');
    }

    // Initialisation du formulaire avec validations requises
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  /** Soumet le formulaire de connexion et redirige selon le role */
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    this.authService.login(this.form.value).subscribe({
      next: (user) => {
        this.loading = false;
        // Redirection basee sur le role de l'utilisateur
        switch (user.role) {
          case 'ADMIN':
          case 'PMO':
            this.router.navigateByUrl('/');
            break;
          case 'PM':
            this.router.navigateByUrl('/projects');
            break;
          case 'RH':
            this.router.navigateByUrl('/users');
            break;
          case 'DEV':
          case 'QA':
          case 'DEVOPS':
            this.router.navigateByUrl('/tasks');
            break;
          default:
            this.router.navigateByUrl('/');
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.error || 'Login failed. Check your credentials.';
        this.cdr.detectChanges();
      },
    });
  }
}
