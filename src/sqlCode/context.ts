import { AnyType } from '../_types';

export default class SQLCodeCtx {
	domainModel: AnyType;
	value!: {
		get(): AnyType;
		set(v: AnyType): void;
	};
	sql!: string;
	paramKeys: string[] = [];
	lastDecorations: AnyType = [];
	
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
