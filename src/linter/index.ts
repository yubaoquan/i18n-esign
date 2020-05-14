import * as vscode from 'vscode';
import { triggerUpdateDecorations } from '../linter/chineseCharDecorations';
import { TargetStr } from '../linter/define';
/**
 * 注册中文标红框功能
 */
function registerLinter(context: vscode.ExtensionContext) {
  let targetStrs: TargetStr[] = [];

  let activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    triggerUpdateDecorations((newTargetStrs: TargetStr[]) => {
      targetStrs = newTargetStrs;
    });
  }

  // 当 切换文档 的时候重新检测当前文档中的中文文案
  const dispose1 = vscode.window.onDidChangeActiveTextEditor(editor => {
    activeEditor = editor;
    if (editor) {
      triggerUpdateDecorations((newTargetStrs: TargetStr[]) => {
        targetStrs = newTargetStrs;
      });
    }
  }, null);

  // 当 文档发生变化时 的时候重新检测当前文档中的中文文案
  const dispose2 = vscode.workspace.onDidChangeTextDocument(event => {
    if (activeEditor && event.document === activeEditor.document) {
      triggerUpdateDecorations((newTargetStrs: TargetStr[]) => {
        targetStrs = newTargetStrs;
      });
    }
  }, null);

  context.subscriptions.push(dispose1, dispose2);
  return [dispose1, dispose2];
}

export {
  registerLinter,
};
