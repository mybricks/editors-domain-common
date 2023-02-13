/** parse JSON string，同时 catch 错误 */
export const safeParse = (content: string, defaultValue = {}) => {
	try {
		return JSON.parse(content);
	} catch {
		return defaultValue;
	}
};

/** 编码 */
export const safeEncodeURIComponent = (content: string) => {
	try {
		return encodeURIComponent(content);
	} catch {
		return content ?? '';
	}
};

/** 解码 */
export const safeDecodeURIComponent = (content: string) => {
	try {
		return decodeURIComponent(content);
	} catch {
		return content ?? '';
	}
};