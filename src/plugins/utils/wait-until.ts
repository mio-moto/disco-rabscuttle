export async function waitUntil(condition: boolean) {
  return await new Promise<void>(resolve => {
    const interval = setInterval(() => {
      if (condition) {
        resolve();
        clearInterval(interval);
      }
    }, 1000);
  });
}

export async function waitFor(milliseconds: number) {
  return await new Promise<void>(resolve => {
    setTimeout(() => {
      resolve();
    }, milliseconds);
  });
}
