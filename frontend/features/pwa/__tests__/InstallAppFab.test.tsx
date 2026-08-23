import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { InstallAppFab } from '../InstallAppFab';
import type { PwaState } from '../pwaStore';

const mockOpenModal = jest.fn();
const mockState = jest.fn();

jest.mock('../pwaStore', () => ({ openModal: () => mockOpenModal() }));
jest.mock('../usePwaInstall', () => ({ usePwaState: () => mockState() }));

function givenState(overrides: Partial<PwaState> = {}): void {
  mockState.mockReturnValue({
    canPrompt: false,
    isInstalled: false,
    platform: 'chromium',
    isModalOpen: false,
    updateAvailable: false,
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('opens the explanatory modal when tapped', async () => {
  givenState();
  render(<InstallAppFab />);

  await userEvent.click(screen.getByRole('button', { name: /Instalar la aplicación/ }));

  expect(mockOpenModal).toHaveBeenCalledTimes(1);
});

it('stays visible where installing needs manual steps', () => {
  givenState({ platform: 'firefox' });
  render(<InstallAppFab />);

  expect(screen.getByTestId('pwa-install-fab')).toBeInTheDocument();
});

it('disappears once the app is installed', () => {
  givenState({ isInstalled: true });
  render(<InstallAppFab />);

  expect(screen.queryByTestId('pwa-install-fab')).not.toBeInTheDocument();
});

it('yields the corner while a panel covers it', () => {
  givenState();
  render(<InstallAppFab hidden />);

  expect(screen.queryByTestId('pwa-install-fab')).not.toBeInTheDocument();
});
