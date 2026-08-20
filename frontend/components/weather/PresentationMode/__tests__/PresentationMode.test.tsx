import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PresentationMode } from '../PresentationMode';


describe('PresentationMode', () => {
  it('exposes controlled state and emits the button toggle once', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<PresentationMode active={false} onChange={onChange} />);

    const button = screen.getByRole('button', { name: /Modo presentación/ });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: 'Pantalla completa' })).not.toBeInTheDocument();
    await user.click(button);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('toggles with P and leaves the controlled active value to the parent', () => {
    const onChange = jest.fn();
    render(<PresentationMode active onChange={onChange} />);

    fireEvent.keyDown(window, { key: 'p' });

    expect(onChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole('button', { name: 'Salir de presentación' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('ignores P while typing and when modifiers or repeat are present', () => {
    const onChange = jest.fn();
    render(
      <>
        <input aria-label="Búsqueda" />
        <textarea aria-label="Notas" />
        <select aria-label="Opciones"><option>Uno</option></select>
        <div aria-label="Editor" contentEditable />
        <PresentationMode active={false} onChange={onChange} />
      </>,
    );

    for (const target of [
      screen.getByLabelText('Búsqueda'),
      screen.getByLabelText('Notas'),
      screen.getByLabelText('Opciones'),
      screen.getByLabelText('Editor'),
    ]) {
      fireEvent.keyDown(target, { key: 'P' });
    }
    fireEvent.keyDown(window, { key: 'P', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'P', repeat: true });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('requests fullscreen only after the secondary button is clicked', async () => {
    const user = userEvent.setup();
    const fullscreenRequest = jest.fn(async () => undefined);
    render(
      <PresentationMode
        active
        onChange={jest.fn()}
        fullscreenRequest={fullscreenRequest}
      />,
    );

    expect(fullscreenRequest).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Pantalla completa' }));

    expect(fullscreenRequest).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('status')).toHaveTextContent('Pantalla completa solicitada');
  });

  it('keeps internal presentation available when fullscreen rejects', async () => {
    const user = userEvent.setup();
    const fullscreenRequest = jest.fn(async () => {
      throw new Error('denied');
    });
    render(
      <PresentationMode
        active
        onChange={jest.fn()}
        fullscreenRequest={fullscreenRequest}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Pantalla completa' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'el modo presentación interno sigue activo',
    );
    expect(screen.getByRole('button', { name: 'Salir de presentación' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows the same fallback when the Fullscreen API is absent', async () => {
    const user = userEvent.setup();
    render(
      <PresentationMode active onChange={jest.fn()} fullscreenRequest={null} />,
    );

    await user.click(screen.getByRole('button', { name: 'Pantalla completa' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Pantalla completa no disponible');
  });

  it('removes the global keyboard listener on unmount', async () => {
    const onChange = jest.fn();
    const { unmount } = render(<PresentationMode active={false} onChange={onChange} />);

    unmount();
    fireEvent.keyDown(window, { key: 'P' });
    await waitFor(() => expect(onChange).not.toHaveBeenCalled());
  });
});
