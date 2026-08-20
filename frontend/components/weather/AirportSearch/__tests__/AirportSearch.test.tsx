import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AirportSearch } from '@/components/weather/AirportSearch';
import { createAirportCollectionFixture } from '@/features/airports/__tests__/airportTestFixtures';


const airports = createAirportCollectionFixture();

function renderSearch(overrides = {}) {
  const onSelectAirport = jest.fn();
  render(
    <AirportSearch
      airports={airports}
      selectedAirport={null}
      onSelectAirport={onSelectAirport}
      {...overrides}
    />,
  );
  return { onSelectAirport };
}

describe('AirportSearch', () => {
  it('opens matching results and announces their count', async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.type(screen.getByRole('combobox'), 'bog');

    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('1 aeropuerto disponible');
    expect(within(screen.getByRole('listbox')).getByRole('option')).toHaveTextContent('SKBO');
    expect(screen.getByText('Bogotá')).toBeInTheDocument();
  });

  it('walks the list with arrows and selects the active option with Enter', async () => {
    const user = userEvent.setup();
    const { onSelectAirport } = renderSearch();
    const input = screen.getByRole('combobox');

    await user.type(input, 'sk');
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(onSelectAirport).toHaveBeenCalledTimes(1);
    expect(onSelectAirport).toHaveBeenCalledWith('SKRG');
    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('selects the first ranked result with Enter before arrow navigation', async () => {
    const user = userEvent.setup();
    const { onSelectAirport } = renderSearch();

    await user.type(screen.getByRole('combobox'), 'bogota');
    await user.keyboard('{Enter}');

    expect(onSelectAirport).toHaveBeenCalledWith('SKBO');
  });

  it('restores the controlled selection when Escape closes an edit', async () => {
    const user = userEvent.setup();
    renderSearch({ selectedAirport: 'SKBO' });
    const input = screen.getByRole('combobox');

    await user.clear(input);
    await user.type(input, 'cali');
    await user.keyboard('{Escape}');

    expect(input).toHaveValue('SKBO');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('emits one ICAO for pointer selection', async () => {
    const user = userEvent.setup();
    const { onSelectAirport } = renderSearch();

    await user.type(screen.getByRole('combobox'), 'medellin');
    await user.click(screen.getByRole('option', { name: /SKRG/ }));

    expect(onSelectAirport).toHaveBeenCalledTimes(1);
    expect(onSelectAirport).toHaveBeenCalledWith('SKRG');
  });

  it('closes on outside pointer input and exposes the empty result copy', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <AirportSearch
          airports={airports}
          selectedAirport={null}
          onSelectAirport={jest.fn()}
        />
        <button type="button">Fuera</button>
      </div>,
    );
    const input = screen.getByRole('combobox');

    await user.type(input, 'LHR');
    expect(screen.getByText('No hay aeropuertos en este demo')).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Fuera' }));
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveValue('');
  });

  it('does not open or emit while disabled', async () => {
    const user = userEvent.setup();
    const { onSelectAirport } = renderSearch({ disabled: true });
    const input = screen.getByRole('combobox');

    expect(input).toBeDisabled();
    await user.click(input);
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(onSelectAirport).not.toHaveBeenCalled();
  });

  it('derives the closed value from the controlled selection prop', () => {
    const onSelectAirport = jest.fn();
    const { rerender } = render(
      <AirportSearch
        airports={airports}
        selectedAirport={null}
        onSelectAirport={onSelectAirport}
      />,
    );

    rerender(
      <AirportSearch
        airports={airports}
        selectedAirport="SKBO"
        onSelectAirport={onSelectAirport}
      />,
    );
    expect(screen.getByRole('combobox')).toHaveValue('SKBO');

    rerender(
      <AirportSearch
        airports={airports}
        selectedAirport={null}
        onSelectAirport={onSelectAirport}
      />,
    );
    expect(screen.getByRole('combobox')).toHaveValue('');
  });

  it('removes its outside-pointer listener on unmount', () => {
    const addListener = jest.spyOn(document, 'addEventListener');
    const removeListener = jest.spyOn(document, 'removeEventListener');
    const { unmount } = render(
      <AirportSearch
        airports={airports}
        selectedAirport={null}
        onSelectAirport={jest.fn()}
      />,
    );
    const pointerRegistration = addListener.mock.calls.find(([type]) => type === 'pointerdown');

    unmount();

    expect(pointerRegistration).toBeDefined();
    expect(removeListener).toHaveBeenCalledWith('pointerdown', pointerRegistration?.[1]);
    addListener.mockRestore();
    removeListener.mockRestore();
  });
});
