import { SprintOnboardingModal } from '@/obsidian/SprintOnboardingModal';

describe('SprintOnboardingModal', () => {
  const context = {
    rootFolder: 'Sprint',
    durationWeeks: 1,
    futureSprintCount: 1,
    existingWorkspace: false,
  };

  it('records closing the first-run prompt as a dismissal', () => {
    const onDismiss = jest.fn().mockResolvedValue(undefined);
    const modal = new SprintOnboardingModal({} as never, context, {
      onSetup: jest.fn().mockResolvedValue(undefined),
      onDismiss,
    });

    modal.onClose();

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('runs setup without also recording a dismissal', () => {
    const onSetup = jest.fn().mockResolvedValue(undefined);
    const onDismiss = jest.fn().mockResolvedValue(undefined);
    const modal = new SprintOnboardingModal({} as never, context, {
      onSetup,
      onDismiss,
    });

    (modal as unknown as { setup(): void }).setup();
    modal.onClose();

    expect(onSetup).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
