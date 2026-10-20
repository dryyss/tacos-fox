/* Valeur des réglages, ou repère visible tant que le restaurant ne l'a pas fournie */
export function orTodo(value: string | null | undefined, label: string) {
  return value?.trim() ? value : <mark style={{ background: 'var(--yellow)', padding: '0 4px' }}>[{label} à compléter]</mark>;
}
