import { AnyType } from '../_types';
import { Entity } from '../_types/domain';

export default class ViewCtx {
	domainModel: AnyType;
	fromEntity!: Entity;
	
	value!: {
		get(): AnyType;
		set(v: AnyType): void;
	};
	nowValue: AnyType;
	
	close?: () => void;
	
	blurAry: Array<() => void> = [];
	
	addBlur(fn: () => void) {
		this.blurAry.push(fn);
	}
	
	blurAll() {
		if (this.blurAry.length > 0) {
			this.blurAry.forEach(fn => fn());
		}
	}
	
	save() {
		this.close?.();
	}
}
