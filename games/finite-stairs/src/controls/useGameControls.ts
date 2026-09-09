import { useEffect, useRef } from 'react';
import type { ControlAction } from './mapControl';
import { mapKeyboardEvent } from './mapControl';

export function useGameControls(onAction: (action: ControlAction) => void, enabled: boolean): void {
  const onActionRef = useRef(onAction);

  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

  useEffect(() => {
    if (!enabled) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const action = mapKeyboardEvent(event.key);
      if (!action) return;
      event.preventDefault();
      onActionRef.current(action);
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
