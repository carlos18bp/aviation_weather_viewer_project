import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SceneShare } from '../SceneShare';


const SCENE_URL = 'https://demo.local/?layer=temperature&t=09Z';

describe('SceneShare', () => {
  it('copies the exact scene URL through the Clipboard API', async () => {
    const user = userEvent.setup();
    const clipboard = { writeText: jest.fn(async () => undefined) };
    render(<SceneShare url={SCENE_URL} clipboard={clipboard} />);

    await user.click(screen.getByRole('button', { name: 'Copiar enlace de escena' }));

    expect(clipboard.writeText).toHaveBeenCalledWith(SCENE_URL);
    expect(await screen.findByRole('status')).toHaveTextContent('Enlace de escena copiado');
  });

  it('reveals and selects a manual fallback when Clipboard rejects', async () => {
    const user = userEvent.setup();
    const clipboard = { writeText: jest.fn(async () => {
      throw new Error('denied');
    }) };
    render(<SceneShare url={SCENE_URL} clipboard={clipboard} />);

    await user.click(screen.getByRole('button', { name: 'Copiar enlace de escena' }));

    const manual = await screen.findByLabelText('Copia manualmente este enlace');
    expect(manual).toHaveValue(SCENE_URL);
    expect(manual).toHaveFocus();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'La copia automática no está disponible',
    );
  });

  it('uses the selectable fallback when Clipboard is absent', async () => {
    const user = userEvent.setup();
    render(<SceneShare url={SCENE_URL} clipboard={null} />);

    await user.click(screen.getByRole('button', { name: 'Copiar enlace de escena' }));
    const manual = await screen.findByLabelText('Copia manualmente este enlace');
    await user.click(manual);

    expect(manual).toHaveValue(SCENE_URL);
    expect(manual).toHaveAttribute('readonly');
  });

  it('clears stale feedback when the serialized scene changes', async () => {
    const user = userEvent.setup();
    const clipboard = { writeText: jest.fn(async () => undefined) };
    const { rerender } = render(<SceneShare url={SCENE_URL} clipboard={clipboard} />);
    await user.click(screen.getByRole('button', { name: 'Copiar enlace de escena' }));
    expect(await screen.findByRole('status')).toBeInTheDocument();

    rerender(<SceneShare url="https://demo.local/?mode=present" clipboard={clipboard} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
