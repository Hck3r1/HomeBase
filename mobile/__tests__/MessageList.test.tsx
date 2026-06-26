import React from 'react';
import { render } from '@testing-library/react-native';
import { MessageList } from '../src/components/MessageList';
import { Message } from '../src/api/messaging';

const messages: Message[] = [
  { id: '1', conversationId: 'c1', senderId: 'me', body: 'Hi there', readAt: null, createdAt: '2026-06-19T10:00:00Z' },
  {
    id: '2',
    conversationId: 'c1',
    senderId: 'them',
    body: 'Hello!',
    readAt: '2026-06-19T10:01:00Z',
    createdAt: '2026-06-19T10:01:00Z',
  },
];

describe('MessageList', () => {
  it('renders every message bubble', () => {
    const { getByText, getByTestId } = render(<MessageList messages={messages} currentUserId="me" />);
    expect(getByTestId('message-list')).toBeTruthy();
    expect(getByText('Hi there')).toBeTruthy();
    expect(getByText('Hello!')).toBeTruthy();
  });
});
