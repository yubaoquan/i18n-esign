import * as vscode from 'vscode';
import { triggerUpdateDecorations } from './untranslatedDecorations';
/**
 * 注册中文标红框功能
 */
function registerLinter(context: vscode.ExtensionContext) {
  let activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) triggerUpdateDecorations();

  // 当 切换文档 的时候重新检测当前文档中的中文文案
  const dispose1 = vscode.window.onDidChangeActiveTextEditor(editor => {
    activeEditor = editor;
    if (editor) triggerUpdateDecorations();
  }, null);

  // 当 文档发生变化时 的时候重新检测当前文档中的中文文案
  const dispose2 = vscode.workspace.onDidChangeTextDocument(event => {
    if (activeEditor && event.document === activeEditor.document) {
      triggerUpdateDecorations();
    }
  }, null);

  context.subscriptions.push(dispose1, dispose2);
  return [dispose1, dispose2];
}

export {
  registerLinter,
};
