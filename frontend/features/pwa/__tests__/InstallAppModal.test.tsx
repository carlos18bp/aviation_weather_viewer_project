import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DEMO_WARNING_TEXT } from '@/components/weather/DemoWarning';

import { InstallAppModal } from '../InstallAppModal';
import type { PwaState } from '../pwaStore';

const mockCloseModal = jest.fn();
const mockPromptInstall = jest.fn().mockResolvedValue('accepted');
const mockState = jest.fn();

jest.mock('../pwaStore', () => ({
  closeModal: () => mockCloseModal(),
  promptInstall: () => mockPromptInstall(),
}));

jest.mock('../usePwaInstall', () => ({ usePwaState: () => mockState() }));

function givenState(overrides: Partial<PwaState> = {}): void {
  mockState.mockReturnValue({
    canPrompt: false,
    isInstalled: false,
    platform: 'chromium',
    isModalOpen: true,
    updateAvailable: false,
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPromptInstall.mockResolvedValue('accepted');
});

it('fires the native installer when the browser handed us a prompt', async () => {
  givenState({ canPrompt: true, platform: 'chromium' });
  render(<InstallAppModal />);

  await userEvent.click(screen.getByRole('button', { name: 'Instalar ahora' }));

  expect(mockPromptInstall).toHaveBeenCalledTimes(1);
});

it('walks iOS Safari users through Add to Home Screen instead', () => {
  givenState({ canPrompt: false, platform: 'ios-safari' });
  render(<InstallAppModal />);

  expect(screen.getByText(/menú Compartir de Safari/)).toBeInTheDocument();
  expect(screen.getByText(/Añadir a pantalla de inicio/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Instalar ahora' })).not.toBeInTheDocument();
});

it('tells users of an embedded webview to leave it', () => {
  givenState({ canPrompt: false, platform: 'in-app-webview' });
  render(<InstallAppModal />);

  expect(screen.getByText(/dentro de otra aplicación/)).toBeInTheDocument();
  expect(screen.getByText(/Abrir en el navegador/)).toBeInTheDocument();
});

it('repeats the simulated-data warning it covers while open', () => {
  givenState();
  render(<InstallAppModal />);

  expect(screen.getByRole('note')).toHaveTextContent(DEMO_WARNING_TEXT);
});

it('closes on Escape', async () => {
  givenState();
  render(<InstallAppModal />);

  await userEvent.keyboard('{Escape}');

  expect(mockCloseModal).toHaveBeenCalledTimes(1);
});

it('returns focus to whatever opened it', () => {
  givenState();
  const trigger = document.createElement('button');
  document.body.appendChild(trigger);
  trigger.focus();

  const { rerender } = render(<InstallAppModal />);
  expect(trigger).not.toHaveFocus();

  givenState({ isModalOpen: false });
  rerender(<InstallAppModal />);

  expect(trigger).toHaveFocus();
});
