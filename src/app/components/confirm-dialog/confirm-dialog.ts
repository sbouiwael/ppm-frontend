/**
 * Composant reutilisable de dialogue de confirmation.
 * Affiche un overlay modal avec un titre, un message et deux boutons
 * (confirmer/annuler). Emet des evenements 'confirmed' ou 'cancelled'
 * selon l'action de l'utilisateur.
 */
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.html',
  styleUrls: ['./confirm-dialog.css'],
})
export class ConfirmDialog {
  /** Controle la visibilite du dialogue */
  @Input() visible = false;
  /** Titre du dialogue */
  @Input() title = 'Confirm';
  /** Message de confirmation affiche */
  @Input() message = 'Are you sure?';
  /** Libelle du bouton de confirmation */
  @Input() confirmLabel = 'Delete';
  /** Libelle du bouton d'annulation */
  @Input() cancelLabel = 'Cancel';

  /** Evenement emis lorsque l'utilisateur confirme */
  @Output() confirmed = new EventEmitter<void>();
  /** Evenement emis lorsque l'utilisateur annule */
  @Output() cancelled = new EventEmitter<void>();

  /** Gere le clic sur le bouton de confirmation */
  onConfirm(): void {
    this.confirmed.emit();
  }

  /** Gere le clic sur le bouton d'annulation */
  onCancel(): void {
    this.cancelled.emit();
  }

  /** Ferme le dialogue si l'utilisateur clique sur l'overlay (fond sombre) */
  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-overlay')) {
      this.onCancel();
    }
  }
}
