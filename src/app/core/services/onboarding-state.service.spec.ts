import { OnboardingStateService } from './onboarding-state.service';

describe('OnboardingStateService', () => {
  let service: OnboardingStateService;

  beforeEach(() => {
    service = new OnboardingStateService();
  });

  it('patchFromRoleSelection fusionne etat', () => {
    service.patchFromRoleSelection({ prenom: 'John', roleKey: 'entreprise' });
    const state = service.state();
    expect(state.prenom).toBe('John');
    expect(state.roleKey).toBe('entreprise');
  });

  it('reset remet un etat vide', () => {
    service.patchFromRoleSelection({ prenom: 'Jane', respNom: 'Doe' });
    service.reset();
    const state = service.state();
    expect(state.prenom).toBe('');
    expect(state.respNom).toBe('');
    expect(state.roleKey).toBeNull();
  });

  it('requiresWizard vrai uniquement pour role entreprise', () => {
    service.patchFromRoleSelection({ roleKey: 'financier' });
    expect(service.requiresWizard).toBeFalse();
    service.patchFromRoleSelection({ roleKey: 'entreprise' });
    expect(service.requiresWizard).toBeTrue();
  });
});