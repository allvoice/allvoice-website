export function isEmpty<T>(array: T[] | undefined) {
  if (array == null) {
    return true;
  }

  return array.length == 0;
}
