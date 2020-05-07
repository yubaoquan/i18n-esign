// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as json2xls from 'json2xls';
import { localeInit, localize } from './utils/locale';
import { triggerUpdateDecorations } from './chineseCharDecorations';
import { TargetStr } from './define';
import { getConfiguration } from './utils';

localeInit();

/**
 * 注册 Excel 的功能
 * @param context
 */
function registerExcelCmd(context: vscode.ExtensionContext) {
  let disposable2 = vscode.commands.registerCommand('i18n-esign.excel', (e) => {
    try {
      const jsonFileNames = fs.readdirSync(e.fsPath).filter(name => /.json$/.test(name));

      // 当前目录下没有找到 json 文件, 直接返回
      if (jsonFileNames.length === 0) {
        const message = localize('file-not-found', 'File not found, please check path');
        vscode.window.showErrorMessage(`${message} ${e.fsPath}`);
        return;
      }

      const files = jsonFileNames.map((fileName) => {
        return {
          name: fileName.replace(/.json$/, ''),
          path: path.resolve(e.fsPath, fileName),
        };
      });

      /**
       * 所有语言打进同一个 json, 格式如下
       * {
       *   "xxx": {
       *     "zh-CN": "你好",
       *     "en-US": "hello"
       *   }
       * }
       */
      const resultJson: any = files.reduce((result: any, file) => {
        const json = require(file.path);
        Object.entries(json).forEach(([key, value]) => {
          result[key] = result[key] || {};
          result[key][file.name] = value;
        });

        return result;
      }, {});

      // 用于生产 excel 的数组 [{ key: 'xxx', 'zh-CN': 'xxx', }]
      const excelArr = Object.entries(resultJson)
        .map(([key, langs]) => ({ key, ...langs as any }));

      const excelPath = `${e.fsPath}.${Date.now()}.xlsx`;
      const xls = json2xls(excelArr);
      fs.writeFileSync(excelPath, xls, 'binary');
      const message = localize('success', 'Excel file generate success! Path:');
      vscode.window.showInformationMessage(`${message} ${excelPath}`);
    } catch (e) {
      console.error(e);
      const message = localize('fail', 'Fail to generate excel file, please open vscode devTools to checkout error messages');
      vscode.window.showErrorMessage(message);
    }
  });

  context.subscriptions.push(disposable2);
}

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
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const enableLinterFeature = getConfiguration('enableLinter');
  registerExcelCmd(context);
  if (enableLinterFeature) registerLinter(context);
}

// this method is called when your extension is deactivated
export function deactivate() {}
