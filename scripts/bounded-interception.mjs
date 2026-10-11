export async function waitForIntercept(promise, label, timeoutMs = 10000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Timed out waiting for ${label}`)), timeoutMs); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
