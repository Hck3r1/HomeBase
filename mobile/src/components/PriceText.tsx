import React from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import { theme } from '../theme';
import { priceLabelForListing } from '../lib/format';
import { Listing } from '../types/listing';

export function PriceText({ listing, style }: { listing: Listing; style?: TextStyle }) {
  return <Text style={[styles.price, style]}>{priceLabelForListing(listing)}</Text>;
}

const styles = StyleSheet.create({
  price: {
    color: theme.colors.primary,
    fontWeight: theme.font.weightBold,
    fontSize: theme.font.sizeMd,
  },
});
