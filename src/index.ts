import { typeCheck } from './_utils';
import EditorSelect from './select';
import EditorInsert from './insert';
import EditorUpdate from './update';
import EditorDelete from './delete';
import EditorMapping from './mapping';
import EditorView from './view';
import { AnyType } from './_types';
import DefaultValue from './defaultValue';
import SQLCode from './sqlCode';


const EditorMap: Record<string, unknown> = {
	'DOMAIN.DBSELECT': EditorSelect,
	'DOMAIN.DBINSERT': EditorInsert,
	'DOMAIN.DBUPDATE': EditorUpdate,
	'DOMAIN.DBDELETE': EditorDelete,
	'DOMAIN.MAPPING': EditorMapping,
	'DOMAIN.DEFAULTVALUE': DefaultValue,
	'DOMAIN.SELECT': EditorView,
	'DOMAIN.DBCUSTOMSQL': SQLCode,
};

function Editors(editConfig: { type: string; render: AnyType; }, extOpts: Record<string, unknown>): AnyType {
	let editor;
	try {
		editor = EditorMap[editConfig.type.toUpperCase()] || editConfig.render;
	} catch (err) {
		console.error(err);
	}
	
	if (typeCheck(editor, 'function')) {
		return editor?.({ editConfig }, extOpts);
	}
	
	if (typeCheck(editor, 'object') && typeCheck(editor.render, 'function')) {
		return editor;
	}
	
	return;
}

export { Editors };

