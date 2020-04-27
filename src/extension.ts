// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as json2xls from 'json2xls';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "laa" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  // let disposable = vscode.commands.registerCommand('laa.helloWorld', () => {
  //   // The code you place here will be executed every time your command is executed

  //   // Display a message box to the user
  //   vscode.window.showInformationMessage('Hello World from Laa!---');
  // });

  let disposable2 = vscode.commands.registerCommand('laa.excel', (e) => {
    try {
      const jsonFileNames = fs.readdirSync(e.fsPath).filter(name => /.json$/.test(name));

      // 当前目录下没有找到 json 文件, 直接返回
      if (jsonFileNames.length === 0) {
        vscode.window.showErrorMessage(`未找到语言文件, 请确认所选目录 ${e.fsPath} 是否正确`);
        return;
      }

      const files = jsonFileNames.map((fileName) => {
        return {
          name: fileName.replace(/.json$/, ''),
          path: path.resolve(e.fsPath, fileName),
        };
      });


      //
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

      // 用于生产 excel 的数组
      const excelArr = Object.entries(resultJson)
        .map(([key, langs]) => ({ key, ...langs as any }));

      const excelPath = `${e.fsPath}.${Date.now()}.xlsx`;
      const xls = json2xls(excelArr);
      fs.writeFileSync(excelPath, xls, 'binary');
      vscode.window.showInformationMessage(`Excel 文件生成成功! 路径: ${excelPath}`);
    } catch (e) {
      console.error(e);
      vscode.window.showErrorMessage(`Excel 生成失败, 请联系开发人员或打开 devTools 查看异常信息`);
    }
  });

  // context.subscriptions.push(disposable);
  context.subscriptions.push(disposable2);
}

// this method is called when your extension is deactivated
export function deactivate() {}
