import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SegmentedTypePills } from '../src/components/SegmentedTypePills';

describe('SegmentedTypePills', () => {
  it('renders the three type labels', () => {
    const { getByText } = render(<SegmentedTypePills value="rent" onChange={() => {}} />);
    expect(getByText('Rent')).toBeTruthy();
    expect(getByText('Buy')).toBeTruthy();
    expect(getByText('Short-stay')).toBeTruthy();
  });

  it('emits the mapped listing type on press', () => {
    const onChange = jest.fn();
    const { getByText } = render(<SegmentedTypePills value="rent" onChange={onChange} />);
    fireEvent.press(getByText('Buy'));
    expect(onChange).toHaveBeenCalledWith('sale');
    fireEvent.press(getByText('Short-stay'));
    expect(onChange).toHaveBeenCalledWith('shortstay');
  });
});
