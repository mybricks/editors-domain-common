import { AnyType } from '../_types';

export default class ViewCtx {
	domainModel: AnyType;
	
	value!: {
		get(): AnyType;
		set(v: AnyType): void;
	};
	nowValue: AnyType;
	
	close?: () => void;
	
	blurAry: Array<() => void> = [];
	
	addBlur(fn) {
		this.blurAry.push(fn);
	}
	
	blurAll() {
		if (this.blurAry.length > 0) {
			this.blurAry.forEach(fn => fn());
		}
	}
	
	save() {
	}
}
