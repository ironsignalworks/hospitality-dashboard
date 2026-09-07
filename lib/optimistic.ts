/** Apply local state immediately; roll back if the request fails. */
export async function withOptimistic<T>(
  apply: () => void,
  revert: () => void,
  run: () => Promise<T>
): Promise<T> {
  apply();
  try {
    return await run();
  } catch (error) {
    revert();
    throw error;
  }
}
