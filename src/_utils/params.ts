/* 根据 conditions 获取里面用到的所有的 params */
export function getParamsByConditions(conditions) {
	let result = {};

	conditions.forEach((condition) => {
		if (condition.conditions) {
			result = {
				...result,
				...getParamsByConditions(condition.conditions)
			};
		} else {
			if (/\{params\.\w+\}/.test(condition.value)) {
				let param = condition.value.match(/\{params\.(\w+)\}/);
				result[param[1]] = param[1];
			}
		}
	});

	return result;
}
