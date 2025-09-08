// Thời gian chờ mặc định
const DEFAULT_TIMEOUT = 15000; // 15 giây
const DEFAULT_POLL = 120;      // 120ms mỗi lần check

/**
 * Tìm element đầu tiên match 1 trong các selector.
 * @param {string[]} selectors - Danh sách selector thử lần lượt
 * @param {ParentNode} root - Vùng DOM để tìm (mặc định document)
 * @returns {Element|null}
 */
export function qOne(selectors, root = document) {
    for (const sel of selectors) {
        const el = root.querySelector(sel);
        if (el) return el;
    }
    return null;
}

/**
 * Chờ ms mili giây
 */
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Chờ đến khi có element match 1 trong các selector
 * Dùng polling kết hợp MutationObserver để nhanh + bền.
 *
 * @param {string[]} selectors
 * @param {object} options
 * @param {ParentNode} options.root - DOM root (mặc định document)
 * @param {number} options.timeout - thời gian chờ tối đa (ms)
 * @param {number} options.poll - khoảng polling (ms)
 * @returns {Promise<Element|null>}
 */
export async function waitFor(
    selectors,
    {
        root = document,
        timeout = DEFAULT_TIMEOUT,
        poll = DEFAULT_POLL
    } = {}
) {
    // Thử trực tiếp
    const direct = qOne(selectors, root);
    if (direct) return direct;

    let resolved = null;
    const start = Date.now();

    // MutationObserver để bắt sự kiện DOM thay đổi
    const mo = new MutationObserver(() => {
        const el = qOne(selectors, root);
        if (el && !resolved) {
            resolved = el;
            mo.disconnect();
        }
    });
    mo.observe(root, { childList: true, subtree: true });

    // Polling thêm để đảm bảo không miss
    while (!resolved && (Date.now() - start) < timeout) {
        const el = qOne(selectors, root);
        if (el) { resolved = el; break; }
        await sleep(poll);
    }

    mo.disconnect();
    return resolved;
}

/**
 * Promise với timeout
 * @param {Promise} promise
 * @param {number} ms - timeout
 * @param {Error} err - lỗi nếu timeout
 */
export async function withTimeout(promise, ms, err = new Error('Timeout')) {
    let id;
    const timer = new Promise((_, reject) => {
        id = setTimeout(() => reject(err), ms);
    });
    try {
        return await Promise.race([promise, timer]);
    } finally {
        clearTimeout(id);
    }
}
