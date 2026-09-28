/**
 * 性能优化工具集
 */

/**
 * 创建 RAF 节流的事件处理器
 * 确保回调在一帧内只执行一次
 */
export function rafThrottle<T extends (...args: any[]) => void>(callback: T): T {
    let rafId: number | null = null;
    let lastArgs: any[] | null = null;

    const throttled = (...args: any[]) => {
        lastArgs = args;
        if (rafId === null) {
            rafId = requestAnimationFrame(() => {
                if (lastArgs) {
                    callback(...lastArgs);
                }
                rafId = null;
                lastArgs = null;
            });
        }
    };

    return throttled as T;
}
