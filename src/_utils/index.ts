import { TYPE_MAP } from '../_constants';
import { AnyType } from '../_types';

export function typeCheck(variable: AnyType, type: string): boolean {
	const checkType = /^\[.*\]$/.test(type) ? type : TYPE_MAP[type.toUpperCase()];

	return Object.prototype.toString.call(variable) === checkType;
}