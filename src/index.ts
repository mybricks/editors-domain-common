import {typeCheck} from "./utils";
import EditorSelect from "./select";
import EditorInsert from "./insert";
import EditorUpdate from './update'


const EditorMap: any = {
  'DOMAIN.DBSELECT': EditorSelect,
  'DOMAIN.DBINSERT': EditorInsert,
  'DOMAIN.DBUPDATE': EditorUpdate,
}

function Editors(editConfig, extOpts): any {
  let editor;
  try {
    editor = EditorMap[editConfig.type.toUpperCase()] || editConfig.render;
  } catch (err) {
    console.error(err);
  }

  if (typeCheck(editor, "function")) {
    return editor({editConfig}, extOpts);
  }

  if (typeCheck(editor, "object") && typeCheck(editor.render, "function")) {
    return editor;
  }

  return;
}

export {Editors};

