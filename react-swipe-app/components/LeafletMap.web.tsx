import { forwardRef } from 'react';

export const LeafletMapContainer = forwardRef<HTMLDivElement>((props, ref) => {
  return <div ref={ref} id="leaflet-map" style={{ height: '100%', width: '100%' }} />;
});

LeafletMapContainer.displayName = 'LeafletMapContainer';

