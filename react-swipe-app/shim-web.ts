// Only runs on web; polyfill codegenNativeComponent to avoid runtime crash
if (typeof window !== 'undefined') {
  try {
    const rn = require('react-native');
    if (rn && typeof rn.codegenNativeComponent !== 'function') {
      rn.codegenNativeComponent = function codegenNativeComponent() {
        const React = require('react');
        const { View } = require('react-native');
        return React.forwardRef(function PolyfilledNativeComponent(props: any, ref: any) {
          return React.createElement(View, { ref, ...props });
        });
      };
    }
  } catch {}
}


