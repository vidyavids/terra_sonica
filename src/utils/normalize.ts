/** Min-max normalize to 0..1; all-equal input maps to all zeros. */
export const normalize01: (values: number[]) => number[] = (values) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (!(max > min)) return values.map(() => 0);
  return values.map((v) => (v - min) / (max - min));
};
