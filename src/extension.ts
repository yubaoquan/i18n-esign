// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as json2xls from 'json2xls';
import { localeInit, localize } from './utils/locale';

localeInit();

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

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

// this method is called when your extension is deactivated
export function deactivate() {}
