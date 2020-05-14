import * as vscode from 'vscode';
import { localeInit } from './utils/locale';
import { getConfiguration } from './utils';
import { registerExcelCmd } from './excel';
import { registerLinter } from './linter';

localeInit();
const disposables: vscode.Disposable[] = [];

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // 注册 excel 功能
  disposables.push(...registerExcelCmd(context));

  // 注册标红功能
  if (getConfiguration('enableLinter')) disposables.push(...registerLinter(context));
}

// this method is called when your extension is deactivated
export function deactivate() {
  disposables.forEach(item => item.dispose());
}
