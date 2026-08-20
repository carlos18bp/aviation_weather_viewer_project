import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PresentationMode } from '../PresentationMode';


describe('PresentationMode', () => {
  it('shows inactive controlled state without a fullscreen action', () => {
    render(<PresentationMode active={false} onChange={jest.fn()} />);

    const button = screen.getByRole('button', { name: /Modo presentación/ });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: 'Pantalla completa' })).not.toBeInTheDocument();
  });

  it('emits active state from the main button', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<PresentationMode active={false} onChange={onChange} />);

    const button = screen.getByRole('button', { name: /Modo presentación/ });
    await user.click(button);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('emits inactive state from P while the controlled value remains active', () => {
    const onChange = jest.fn();
    render(<PresentationMode active onChange={onChange} />);

    fireEvent.keyDown(window, { key: 'p' });

    expect(onChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole('button', { name: 'Salir de presentación' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it.each([
    ['input', 'Búsqueda'],
    ['textarea', 'Notas'],
    ['select', 'Opciones'],
    ['contenteditable', 'Editor'],
  ])('ignores P from %s', (_element, label) => {
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

    fireEvent.keyDown(screen.getByLabelText(label), { key: 'P' });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Modo presentación' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it.each([
    ['Control', { ctrlKey: true }],
    ['Alt', { altKey: true }],
    ['Meta', { metaKey: true }],
    ['repeated event', { repeat: true }],
  ])('ignores P with %s', (_case, init) => {
    const onChange = jest.fn();
    render(<PresentationMode active={false} onChange={onChange} />);

    fireEvent.keyDown(window, { key: 'P', ...init });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Modo presentación' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
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

  it('removes the global keyboard listener when the control unmounts', () => {
    const onChange = jest.fn();
    const { rerender } = render(<PresentationMode active={false} onChange={onChange} />);

    rerender(<p role="status">Control desmontado</p>);
    fireEvent.keyDown(window, { key: 'P' });

    expect(screen.getByRole('status')).toHaveTextContent('Control desmontado');
    expect(onChange).not.toHaveBeenCalled();
  });
});
