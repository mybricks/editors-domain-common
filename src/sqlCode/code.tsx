import React, {FC, useCallback, useEffect, useRef, useState} from 'react';
import { useObservable } from '@mybricks/rxui';
import { FullscreenOutlined } from '@ant-design/icons';
import { AnyType } from '../_types';
import { keywords } from './keywords';
import { MONACO_LOADER_JS_URL, MONACO_PATHS } from './constant';
import SQLCodeCtx from './context';
import { getParams, requireJS } from './utils';
import { safeDecodeURIComponent, safeEncodeURIComponent } from '../_utils/util';

import styles from './index.less';

interface CodeEditorProps {
	value: {
		get(): string;
		set(value: string): void;
	};
	popView(title: string, render: FC, options: Record<string, unknown>): void;
	domainModel: AnyType;
	canvasEle: HTMLDivElement;
	paramSchema: Record<string, unknown>
}

const _window = window as AnyType;
const OPTIONS = {
	automaticLayout: true,
	detectIndentation: false,
	formatOnType: false,
	// rtSave: true,
	//value: `SELECT * FROM `,
	scrollbar: { horizontalScrollbarSize: 0, verticalScrollbarSize: 0 },
	//lineNumbers: 'on',
	language: 'sql',
	theme: 'light',
	tabSize: 2,
	readOnly: false,
	wordWrap: 'on',
	minimap: {
		enabled: false
	},
	width: '100%',
	contextmenu: false,
	lineNumbersMinChars: 3,
	lineDecorationsWidth: 0,
	useExtraLib: true,
	renderLineHighlight: false,
	extraLib: '',
	codeLensFontSize: 11,
	fontSize: 11,
	roundedSelection: false,
	scrollBeyondLastLine: false,
};
const CodeEditor: FC<CodeEditorProps> = props => {
	const { value, paramSchema, domainModel, popView } = props;
	const [showCodeBox, setShowCodeBox] = useState(false);
	const sqlCodeContext = useObservable(SQLCodeCtx, next => {
		next({
			domainModel,
			paramKeys: getParams(paramSchema),
			sql: value.get() || '',
			value,
			close,
		});
	}, { to: 'children' });
	
	const openCodeBox = useCallback(() => setShowCodeBox(true), []);
	// const onFormatClick = useCallback(() => {
	// 	monacoEditor.current?.getAction?.(['editor.action.formatDocument'])._run();
	// }, []);

	useEffect(() => {
		if (showCodeBox) {
			popView(
				'编辑SQL',
				() => {
					return (<Code className={styles.codeBoxModal} sqlCodeContext={sqlCodeContext}/>);
				},
				{ onClose: () => setShowCodeBox(false) }
			);
		}
	}, [showCodeBox]);
	
	return (
		<div className={styles.sqlCodeContainer}>
			<div className={styles.header}>
				<div className={styles.title}>编辑SQL</div>
				<div className={styles.operateRow}>
					<div className={styles.operate}>
						{/*<svg*/}
						{/*	viewBox='0 0 1024 1024'*/}
						{/*	version='1.1'*/}
						{/*	xmlns='http://www.w3.org/2000/svg'*/}
						{/*	width='24'*/}
						{/*	height='24'*/}
						{/*>*/}
						{/*	<path*/}
						{/*		d='M541.141333 268.864l61.717334 16.938667-132.394667 482.474666-61.717333-16.938666 132.394666-482.474667zM329.002667 298.666667l44.885333 45.610666-175.36 172.586667 175.04 167.573333-44.266667 46.229334L106.666667 517.504 329.002667 298.666667z m355.882666 0l222.336 218.837333L684.586667 730.666667l-44.266667-46.229334 175.018667-167.573333L640 344.277333 684.885333 298.666667z'*/}
						{/*	></path>*/}
						{/*</svg>*/}
					</div>
					<div className={styles.operate} onClick={openCodeBox}>
						<FullscreenOutlined />
					</div>
				</div>
			</div>
			<Code sqlCodeContext={sqlCodeContext} className={styles.sqlCode} />
		</div>
	);
};

type CodeProps = {
	className: string;
	sqlCodeContext: SQLCodeCtx;
};
const Code: FC<CodeProps> = props => {
	const { className, sqlCodeContext } = props;
	const monacoEditor = useRef<AnyType>(null);
	const monacoDOMRef = useRef(null);

	const setMonacoOptions = useCallback((monaco: AnyType) => {
		if (!monacoEditor.current) {
			monacoEditor.current = monaco.editor.create(monacoDOMRef.current, OPTIONS);
		}

		monacoEditor.current.setValue(safeDecodeURIComponent(sqlCodeContext.sql || ''));
		monacoEditor.current.onDidChangeModelContent(() => {
			const sql = safeEncodeURIComponent(monacoEditor.current.getValue());
			sqlCodeContext.sql = sql;
			sqlCodeContext.value.set(sql);
			setVarDecorations(monacoEditor.current);
		});

		setVarDecorations(monacoEditor.current);
	}, []);

	const initMonaco = useCallback(() => {
		if (!_window.monaco) {
			requireJS(MONACO_LOADER_JS_URL, () => {
				_window.require.config({ paths: MONACO_PATHS });
				_window.require(['vs/editor/editor.main'], (monaco: AnyType) => {
					_window.define.amd = void 0;

					setMonacoOptions(monaco);

					monaco.languages.registerCompletionItemProvider('sql', {
						triggerCharacters: ['.', ' ', '{'],
						provideCompletionItems: (model, position) => {
							const { lineNumber, column } = position;

							const textBeforePointer = model.getValueInRange({
								startLineNumber: lineNumber,
								endLineNumber: lineNumber,
								startColumn: 0,
								endColumn: column
							});
							const tokens = textBeforePointer.trim().split(/\s+/);
							const lastToken = tokens[tokens.length - 1].toLowerCase();

							let suggestions;

							if (['from', 'into', 'update'].includes(lastToken)) {
								suggestions = sqlCodeContext.domainModel.entityAry.map(entity => {
									return {
										label: entity.name,
										kind: monaco.languages.CompletionItemKind.Constant,
										detail: '表',
										insertText: entity.name
									};
								});
							} else if (lastToken === '{{' || lastToken.endsWith('{{')) {
								suggestions = sqlCodeContext.paramKeys.map(param => {
									return {
										label: param,
										kind: monaco.languages.CompletionItemKind.Constant,
										detail: '参数',
										insertText: param
									};
								});
							} else {
								suggestions = keywords.map(keyword => {
									return {
										label: keyword,
										kind: monaco.languages.CompletionItemKind.Keyword,
										detail: '关键字',
										insertText: keyword.startsWith('$') ? keyword.slice(1) : keyword
									};
								});
							}
							return {
								suggestions,
							};
						}
					});
				});
			});
		} else {
			setMonacoOptions(_window.monaco);
		}
	}, []);
	const setVarDecorations = useCallback(monacoEditor => {
		const model = monacoEditor.getModel();
		const vars = model.findMatches(/\{\{[^\\}]*\\}\\}/gi, true, true, false, null, true);

		if (vars) {
			monacoEditor.deltaDecorations(
				sqlCodeContext.lastDecorations,
				[{ range: new _window.monaco.Range(1, 1, 1, 1), options: {} }]
			);

			const decorations: AnyType = [];
			vars.forEach(curVar => {
				decorations.push({ range: curVar.range, options: { inlineClassName: styles.var } });
			});

			sqlCodeContext.lastDecorations = monacoEditor.deltaDecorations(
				sqlCodeContext.lastDecorations,
				decorations
			);
		}
	}, []);

	useEffect(() => {
		initMonaco();

		return () => monacoEditor.current?.dispose();
	}, []);

	return <div className={className} ref={monacoDOMRef}></div>;
};

export default CodeEditor;
