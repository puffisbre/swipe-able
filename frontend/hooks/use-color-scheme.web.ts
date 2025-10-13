// Always return light mode for web
export function useColorScheme() {
  return "light" as const;
}
