import {typeCheck} from "./utils";
import EditorSelect from "./select";
import EditorInsert from "./insert";


const EditorMap: any = {
  'DOMAIN.DBSELECT': EditorSelect,
  'DOMAIN.DBINSERT': EditorInsert,
}

function Editors(editConfig, extOpts): any {
  let editor;
  try {
    editor = EditorMap[editConfig.type.toUpperCase()] || editConfig.render;
  } catch (err) {
    console.error(err);
  }
	
  if (typeCheck(editor, "function")) {
    return editor({ editConfig }, extOpts);
  }

  if (typeCheck(editor, "object") && typeCheck(editor.render, "function")) {
    return editor;
  }

  return;
}

export {Editors};

