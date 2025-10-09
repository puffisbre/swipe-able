import { forwardRef } from 'react';
import { View } from 'react-native';

export const LeafletMapContainer = forwardRef<any>((props, ref) => {
  return <View style={{ flex: 1 }} />;
});

LeafletMapContainer.displayName = 'LeafletMapContainer';

