/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock openai SDK to avoid ESM/network issues in Jest
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: { completions: { create: jest.fn().mockResolvedValue({ choices: [{ message: { content: '' } }] }) } },
    })),
  };
});

// Mock react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

test('renders correctly', async () => {
  jest.useFakeTimers();
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
  // flush animations and splash timer
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(3000);
  });
  jest.useRealTimers();
});
