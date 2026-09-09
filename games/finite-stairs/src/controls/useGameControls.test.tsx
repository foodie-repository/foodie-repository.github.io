import { fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { useGameControls } from './useGameControls';

function Harness({ enabled = true }: { enabled?: boolean }) {
  const [actions, setActions] = useState<string[]>([]);
  useGameControls((action) => setActions((current) => [...current, action]), enabled);
  return <output aria-label="actions">{actions.join(',')}</output>;
}

describe('useGameControls', () => {
  it('dispatches ArrowUp and Space through the same control callback', () => {
    const view = render(<Harness />);

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: ' ' });

    expect(view.getByLabelText('actions')).toHaveTextContent('climb,turnAndClimb');
  });

  it('ignores held repeats and all keys while disabled', () => {
    const enabled = render(<Harness />);
    fireEvent.keyDown(window, { key: 'ArrowUp', repeat: true });
    expect(enabled.getByLabelText('actions')).toHaveTextContent('');
    enabled.unmount();

    const disabled = render(<Harness enabled={false} />);
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(disabled.getByLabelText('actions')).toHaveTextContent('');
  });
});
