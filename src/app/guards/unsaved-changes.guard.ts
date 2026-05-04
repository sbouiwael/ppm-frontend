/**
 * Guard canDeactivate pour proteger les formulaires contre la perte de donnees.
 *
 * USAGE :
 *   1. Implementer l'interface HasUnsavedChanges dans le composant formulaire.
 *   2. Ajouter canDeactivate: [unsavedChangesGuard] dans la route.
 *
 * INTERFACE HasUnsavedChanges :
 *   Les composants doivent implementer hasUnsavedChanges() qui retourne :
 *   - true  : des modifications non sauvegardees existent → le guard affiche un avertissement
 *   - false : formulaire propre ou sauvegarde reussie → navigation libre
 *
 * PATTERN RECOMMANDE dans le composant :
 *   private savedSuccessfully = false;
 *
 *   hasUnsavedChanges(): boolean {
 *     return this.form.dirty && !this.savedSuccessfully;
 *   }
 *
 *   submit(): void {
 *     // ... appel API ...
 *     next: () => {
 *       this.savedSuccessfully = true;
 *       this.router.navigate(...);
 *     }
 *   }
 *
 * LOGIQUE PPM :
 *   Les formulaires de creation/edition de projets, taches et utilisateurs
 *   contiennent des donnees critiques. Cette protection evite les pertes accidentelles
 *   lors de navigations par inadvertance (clic sur un lien, bouton retour, etc.).
 */
import { CanDeactivateFn } from '@angular/router';

/** Interface que les composants formulaires doivent implementer */
export interface HasUnsavedChanges {
  /**
   * Retourne true si le formulaire contient des modifications non sauvegardees.
   * Implementer en combinant form.dirty && !savedSuccessfully.
   */
  hasUnsavedChanges(): boolean;
}

/**
 * CanDeactivateFn qui intercepte la navigation si le composant a des changements non sauvegardes.
 * Utilise window.confirm() pour afficher un dialogue natif.
 * En production, on pourrait remplacer par un dialog Angular plus elabore.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  // Si le composant n'a pas de modifications non sauvegardees, autoriser la navigation
  if (!component.hasUnsavedChanges()) {
    return true;
  }

  // Avertissement clair — l'utilisateur peut choisir de rester ou de partir
  return window.confirm(
    'You have unsaved changes.\n\nIf you leave this page, your changes will be lost.\n\nContinue?'
  );
};