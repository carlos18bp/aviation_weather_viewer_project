import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { DemoTimestamp } from '@/features/airports';

import { Timeline, type TimelineProps } from '../Timeline';


const TIMESTAMPS = [
  '2026-01-15T00:00:00Z',
  '2026-01-15T03:00:00Z',
  '2026-01-15T06:00:00Z',
  '2026-01-15T09:00:00Z',
  '2026-01-15T12:00:00Z',
  '2026-01-15T15:00:00Z',
];

function createCallbacks() {
  return {
    onSelect: jest.fn(),
    onPrevious: jest.fn(),
    onNext: jest.fn(),
    onPlay: jest.fn(),
    onPause: jest.fn(),
  };
}

function createProps(overrides: Partial<TimelineProps> = {}): TimelineProps {
  return {
    timestamps: [...TIMESTAMPS],
    activeTimestamp: TIMESTAMPS[2],
    isPlaying: false,
    isLoading: false,
    ...createCallbacks(),
    ...overrides,
  };
}

describe('Timeline', () => {
  it('shows six UTC timestamps and marks the active one unequivocally', () => {
    render(<Timeline {...createProps()} />);

    expect(screen.getAllByRole('button', { name: /^Seleccionar / })).toHaveLength(6);
    expect(screen.getByLabelText('Hora meteorológica seleccionada')).toHaveTextContent('06:00Z');
    expect(screen.getByRole('button', { name: 'Seleccionar 06:00Z' })).toHaveAttribute(
      'aria-current',
      'time',
    );
  });

  it('emits direct, previous, next and play callbacks once per click', async () => {
    const user = userEvent.setup();
    const callbacks = createCallbacks();
    render(<Timeline {...createProps(callbacks)} />);

    await user.click(screen.getByRole('button', { name: 'Timestamp anterior' }));
    await user.click(screen.getByRole('button', { name: 'Timestamp siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Seleccionar 09:00Z' }));
    await user.click(screen.getByRole('button', { name: 'Iniciar reproducción' }));

    expect(callbacks.onPrevious).toHaveBeenCalledTimes(1);
    expect(callbacks.onNext).toHaveBeenCalledTimes(1);
    expect(callbacks.onSelect).toHaveBeenCalledTimes(1);
    expect(callbacks.onSelect).toHaveBeenCalledWith(TIMESTAMPS[3]);
    expect(callbacks.onPlay).toHaveBeenCalledTimes(1);
  });

  it('uses native keyboard activation without duplicate callbacks', async () => {
    const user = userEvent.setup();
    const callbacks = createCallbacks();
    render(<Timeline {...createProps(callbacks)} />);

    screen.getByRole('button', { name: 'Seleccionar 12:00Z' }).focus();
    await user.keyboard('{Enter}');
    screen.getByRole('button', { name: 'Timestamp siguiente' }).focus();
    await user.keyboard(' ');

    expect(callbacks.onSelect).toHaveBeenCalledTimes(1);
    expect(callbacks.onSelect).toHaveBeenCalledWith(TIMESTAMPS[4]);
    expect(callbacks.onNext).toHaveBeenCalledTimes(1);
  });

  it('blocks repeated navigation while loading', () => {
    const callbacks = createCallbacks();
    render(
      <Timeline {...createProps({ ...callbacks, isLoading: true })} />,
    );

    const previous = screen.getByRole('button', { name: 'Timestamp anterior' });
    const next = screen.getByRole('button', { name: 'Timestamp siguiente' });
    const play = screen.getByRole('button', { name: 'Iniciar reproducción' });
    expect(previous).toBeDisabled();
    expect(next).toBeDisabled();
    expect(play).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Seleccionar 09:00Z' })).toBeDisabled();

    fireEvent.click(previous);
    fireEvent.click(next);
    fireEvent.click(play);
    expect(callbacks.onPrevious).not.toHaveBeenCalled();
    expect(callbacks.onNext).not.toHaveBeenCalled();
    expect(callbacks.onPlay).not.toHaveBeenCalled();
  });

  it('keeps pause available while loading', async () => {
    const user = userEvent.setup();
    const callbacks = createCallbacks();
    render(
      <Timeline {...createProps({ ...callbacks, isLoading: true, isPlaying: true })} />,
    );

    const pause = screen.getByRole('button', { name: 'Pausar reproducción' });
    expect(pause).toBeEnabled();
    await user.click(pause);
    expect(callbacks.onPause).toHaveBeenCalledTimes(1);
  });

  it('reports an invalid timestamp count and disables playback', () => {
    const callbacks = createCallbacks();
    render(
      <Timeline {...createProps({ ...callbacks, timestamps: TIMESTAMPS.slice(0, 5) })} />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'El timeline requiere exactamente seis timestamps.',
    );
    expect(screen.getByRole('button', { name: 'Iniciar reproducción' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Timestamp siguiente' })).toBeDisabled();
  });

  it('reports a missing active timestamp without silently selecting another', async () => {
    const user = userEvent.setup();
    const callbacks = createCallbacks();
    render(
      <Timeline
        {...createProps({
          ...callbacks,
          activeTimestamp: '2026-01-15T18:00:00Z',
        })}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'El timestamp activo no está disponible en el timeline.',
    );
    expect(callbacks.onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Timestamp anterior' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Seleccionar 06:00Z' }));
    expect(callbacks.onSelect).toHaveBeenCalledTimes(1);
    expect(callbacks.onSelect).toHaveBeenCalledWith(TIMESTAMPS[2]);
  });

  it('reports malformed ISO props and disables all timestamp requests', () => {
    const callbacks = createCallbacks();
    const timestamps = [...TIMESTAMPS];
    timestamps[4] = 'invalid';
    render(<Timeline {...createProps({ ...callbacks, timestamps })} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'El timeline contiene un timestamp ISO inválido.',
    );
    expect(screen.getByRole('button', { name: 'Iniciar reproducción' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Seleccionar Hora inválida' })).toBeDisabled();
  });

  it('emits pause once when playback is active', async () => {
    const user = userEvent.setup();
    const callbacks = createCallbacks();
    render(<Timeline {...createProps({ ...callbacks, isPlaying: true })} />);

    await user.click(screen.getByRole('button', { name: 'Pausar reproducción' }));

    expect(callbacks.onPause).toHaveBeenCalledTimes(1);
    expect(callbacks.onPlay).not.toHaveBeenCalled();
  });

  it('tracks controlled playback progress across state changes', () => {
    const { rerender } = render(<Timeline {...createProps()} />);
    const pausedProgress = screen.getByTestId('timeline-playback-progress');
    expect(pausedProgress).toHaveAttribute('data-playing', 'false');

    rerender(<Timeline {...createProps({ isPlaying: true })} />);
    const runningProgress = screen.getByTestId('timeline-playback-progress');
    expect(runningProgress).toHaveAttribute('data-playing', 'true');
    expect(runningProgress).toBe(pausedProgress);

    rerender(<Timeline {...createProps({
      isPlaying: true,
      activeTimestamp: TIMESTAMPS[3],
    })} />);
    expect(screen.getByTestId('timeline-playback-progress')).not.toBe(runningProgress);
  });

  it('reflects the controlled atomic transition without changing the active timestamp', () => {
    render(<Timeline {...createProps({
      transition: {
        phase: 'exiting',
        targetTimestamp: TIMESTAMPS[3] as DemoTimestamp,
      },
    })} />);

    const timeline = screen.getByRole('region', {
      name: 'Línea de tiempo meteorológica',
    });
    expect(timeline).toHaveAttribute('data-transition-phase', 'exiting');
    expect(timeline).toHaveAttribute('data-transition-target', TIMESTAMPS[3]);
    expect(screen.getByLabelText('Hora meteorológica seleccionada')).toHaveTextContent('06:00Z');
  });
});
