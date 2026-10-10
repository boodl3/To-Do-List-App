import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom has no pointer capture.
Element.prototype.setPointerCapture = () => undefined;

afterEach(() => {
  cleanup();
  localStorage.clear();
});
