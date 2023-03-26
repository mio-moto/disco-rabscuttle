export async function waitUntil(condition: boolean) {
    return await new Promise(resolve => {
        const interval = setInterval(() => {
            if (condition) {
                resolve('foo');
                clearInterval(interval);
            };
        }, 1000);
    });
}

export async function waitFor(milliseconds: number) {
    return await new Promise(resolve => {
        setTimeout(() => {
            resolve('foo');
        }, milliseconds);
    });
}