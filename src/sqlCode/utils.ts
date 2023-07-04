import { AnyType } from '../_types';

export function requireJS(src: string, cb: () => void, win = window, doc = document) {
	const script: AnyType = doc.createElement('script');
	const head: HTMLHeadElement = doc.getElementsByTagName('head')[0];
	script.type = 'text/javascript';
	script.charset = 'UTF-8';
	script.src = src;
	head.appendChild(script);
	if (script.addEventListener) {
		script.addEventListener('load', cb, false);
	} else if (script.attachEvent) {
		script.attachEvent('onreadystatechange', function () {
			const target: AnyType = win.event && win.event.srcElement;
			if (target && target.readyState == 'loaded') {
				cb();
			}
		});
	}
}

export const getParams = (schema: AnyType) => {
	const params:string[] = [];
	const depGetParams = (schema, preKey = '', paths: string[] = []) => {
		params.push([...paths, preKey].join('.'));
		if ((schema.type === 'object' || schema.type === 'follow') && schema.properties) {
			Object.entries(schema.properties || {}).forEach(([key, value]: AnyType) => {
				depGetParams(value, key, [...paths, preKey]);
			});
		}
	};
	
	schema?.type === 'object' && depGetParams(schema, 'params', []);
	
	return params;
};
