/**
 * 设备检测的实用功能
 */

// 全局常数一次求值
export const isTouchDevice = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
};
