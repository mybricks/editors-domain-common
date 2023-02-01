import { typeCheck } from './_utils';
import EditorSelect from './select';
import EditorInsert from './insert';
import { AnyType } from './_types';


const EditorMap: Record<string, unknown> = {
	'DOMAIN.DBSELECT': EditorSelect,
	'DOMAIN.DBINSERT': EditorInsert,
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

