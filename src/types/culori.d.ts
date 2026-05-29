declare module 'culori' {
  export type Color = { mode: string; [key: string]: unknown }

  export type Converter<T extends Color = Color> = (color: string | Color) => T | undefined

  export interface OklabColor extends Color {
    mode: 'oklab'
    l: number
    a: number
    b: number
  }

  export function converter(mode: 'oklab'): Converter<OklabColor>
  export function converter(mode: string): Converter
}
