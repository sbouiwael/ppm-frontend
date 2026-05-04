import { describe, it, expect, vi } from 'vitest';
import { unsavedChangesGuard, HasUnsavedChanges } from './unsaved-changes.guard';

/**
 * Tests unitaires pour le guard unsavedChangesGuard (Vitest).
 * Verifie les trois cas :
 *   1. Formulaire propre → navigation autorisee sans confirm()
 *   2. Formulaire modifie + confirmation acceptee → navigation autorisee
 *   3. Formulaire modifie + confirmation refusee → navigation bloquee
 */
describe('unsavedChangesGuard', () => {

  it('should allow deactivation when hasUnsavedChanges() returns false', () => {
    const cleanComponent: HasUnsavedChanges = { hasUnsavedChanges: () => false };
    const result = unsavedChangesGuard(cleanComponent, {} as any, {} as any, {} as any);
    expect(result).toBe(true);
  });

  it('should allow deactivation when user confirms leaving', () => {
    const dirtyComponent: HasUnsavedChanges = { hasUnsavedChanges: () => true };
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const result = unsavedChangesGuard(dirtyComponent, {} as any, {} as any, {} as any);
    expect(result).toBe(true);
    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('should block deactivation when user cancels', () => {
    const dirtyComponent: HasUnsavedChanges = { hasUnsavedChanges: () => true };
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const result = unsavedChangesGuard(dirtyComponent, {} as any, {} as any, {} as any);
    expect(result).toBe(false);
    confirmSpy.mockRestore();
  });

  it('should NOT call confirm() when form is clean', () => {
    const cleanComponent: HasUnsavedChanges = { hasUnsavedChanges: () => false };
    const confirmSpy = vi.spyOn(window, 'confirm');
    unsavedChangesGuard(cleanComponent, {} as any, {} as any, {} as any);
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});