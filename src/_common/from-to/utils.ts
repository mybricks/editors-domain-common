import { XPATH_ARRAY,C_TYPES_INFO } from './constants';
import { AnyType } from '../../_types';

export const getPinTypeStyle = function (type): { strokeColor, fillColor } | undefined {
	return C_TYPES_INFO.find(ty => ty.type == (type || 'unknown'));
};

export function isXpathMatch(xpath0: string, xpath1: string) {
	const ia0 = xpath0.indexOf(XPATH_ARRAY), ia1 = xpath1.indexOf(XPATH_ARRAY);
	if (ia0 < 0 && ia1 < 0) {//not in array
		return true;
	}

	const i0 = xpath0.indexOf(XPATH_ARRAY), i1 = xpath1.indexOf(XPATH_ARRAY);
	if (i0 >= 0) {// a/:array/b/c
		if (i1 < 0) {// a1/b1/c1
			return false;
		} else {
			//console.log(xpath0,xpath1)


			const sub0 = xpath0.substring(i0 + XPATH_ARRAY.length);
			const sub1 = xpath1.substring(i1 + XPATH_ARRAY.length);

			//console.log(sub0,sub1)

			if (isXpathMatch(sub0, sub1)) {
				return true;
			} else {
				return false;
			}
		}
	} else if (i1 >= 0) {
		return false;
	}

	const ary0 = xpath0.split('/'), ary1 = xpath1.split('/');

	const notFoundArray = ary0.find((now, idx) => {
		if (now === XPATH_ARRAY) {
			if (ary1[idx] !== XPATH_ARRAY) {
				return true;
			}
		}
	});

	return !notFoundArray;
}

/** schema0 入参字段类型，schema1 实体字段类型 */
export function isTypeMatch(schema0, schema1) {
	if (schema0.root) {
		return false;
	} else if (schema0.type === schema1.type) {
		return true;
	} else if (schema1.type === 'any') {
		return true;
	} else if (schema0.type === 'boolean') {
		return !!schema1.type.match(/number|string/gi);
	} else if (schema0.type === 'number') {
		return !!schema1.type.match(/boolean|string/gi);
	} else if (schema0.type === 'string') {
		return !!schema1.type.match(/boolean|enum/gi);
	} else if (schema0.type === 'enum') {
		return !!schema1.type.match(/string|enum/gi);
	} else {
		return false;
	}
}

export function getTypeTitleBySchema(schema: AnyType) {
	if (!schema || typeof schema !== 'object' || typeof schema.type !== 'string') {
		return '错误类型';
	}

	switch (schema.type) {
	case 'number':
		return '数字';
	case 'string':
		return '字符';
	case 'boolean':
		return '布尔';
	case 'enum':
		return '枚举';
	case 'object':
		return `${!schema.properties ? '任意对象' : '对象'}`;
	case 'array':
		return `${!schema.items ? '任意列表' : '列表'}`;
	case 'any':
		return '任意';
	case 'follow':
		return '跟随';
	case 'unknown':
		return '未知';
	default: {
		return '未定义';
	}
	}
}
