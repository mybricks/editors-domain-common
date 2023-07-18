import { TYPE_MAP } from '../_constants';
import { AnyType } from '../_types';

export function typeCheck(variable: AnyType, type: string): boolean {
	const checkType = /^\[.*\]$/.test(type) ? type : TYPE_MAP[type.toUpperCase()];

	return Object.prototype.toString.call(variable) === checkType;
}

export function uuid(len = 6) {
	const seed = 'abcdefghijklmnopqrstuvwxyz';
	const maxPos = seed.length;
	let rtn = '';
	for (let i = 0; i < len; i++) {
		rtn += seed.charAt(Math.floor(Math.random() * maxPos));
	}
	return 'u_' + rtn;
}