/** Ambient types for CSS Module imports (`import styles from './x.module.css'`). */
declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}
