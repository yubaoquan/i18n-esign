import * as ts from 'typescript';
import * as vscode from 'vscode';
import * as compiler from '@angular/compiler';
import { transerI18n, findVueText } from './babel';
import * as compilerVue from 'vue-template-compiler';

const DOUBLE_BYTE_REGEX = /[^\x00-\xff]/g;

function trimWhiteSpace(code: string, startPos: vscode.Position, endPos: vscode.Position) {
  const lines = code.split('\n');
  const hasContentLines = [];
  const columnOfLine: any = {};

  for (let i = startPos.line; i <= endPos.line; i++) {
    const line = lines[i];
    let colStart = 0;
    let colEnd = line.length;

    if (i === startPos.line) colStart = startPos.character;
    if (i === endPos.line) colEnd = endPos.character;
    const text = line.slice(colStart, colEnd).trim();

    if (text.length) {
      hasContentLines.push(i);
      /** 如果文字前面，全是空格 */
      if (!colStart) colStart = line.length - (line as any).trimLeft().length;
    }
    columnOfLine[i] = [colStart, colEnd];
  }

  const startLine = Math.min(...hasContentLines);
  const startCol = Math.min(...columnOfLine[startLine]);
  const endLine = Math.max(...hasContentLines);
  const endCol = Math.max(...columnOfLine[endLine]);

  return {
    trimStart: new vscode.Position(startLine, startCol),
    trimEnd: new vscode.Position(endLine, endCol)
  };
}

/**
 * 去掉文件中的注释
 * @param code
 * @param fileName
 */
function removeFileComment(code: string, fileName: string) {
  const printer: ts.Printer = ts.createPrinter({ removeComments: true });
  const sourceFile: ts.SourceFile = ts.createSourceFile(
    '',
    code,
    ts.ScriptTarget.ES2015,
    true,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  return printer.printFile(sourceFile);
}

/**
 * 查找 Ts 文件中的中文
 * @param code
 */
function findTextInTs(code: string, fileName: string) {
  const matches: any = [];
  const activeEditor = vscode.window.activeTextEditor as vscode.TextEditor;
  const ast = ts.createSourceFile('', code, ts.ScriptTarget.ES2015, true, ts.ScriptKind.TSX);

  function visit(node: ts.Node) {
    switch (node.kind) {
      case ts.SyntaxKind.StringLiteral: {
        /** 判断 Ts 中的字符串含有中文 */
        const { text } = node as ts.StringLiteral;
        if (text.match(DOUBLE_BYTE_REGEX)) {
          const start = node.getStart();
          const end = node.getEnd();
          /** 加一，减一的原因是，去除引号 */
          const startPos = activeEditor.document.positionAt(start + 1);
          const endPos = activeEditor.document.positionAt(end - 1);
          const range = new vscode.Range(startPos, endPos);

          matches.push({ range, text, isString: true });
        }
        break;
      }

      case ts.SyntaxKind.JsxElement: {
        const { children } = node as ts.JsxElement;
        children.forEach(child => {
          if (child.kind === ts.SyntaxKind.JsxText) {
            const text = child.getText();
            /** 修复注释含有中文的情况，Angular 文件错误的 Ast 情况 */
            const noCommentText = removeFileComment(text, fileName);

            if (noCommentText.match(DOUBLE_BYTE_REGEX)) {
              const start = child.getStart();
              const end = child.getEnd();
              const startPos = activeEditor.document.positionAt(start);
              const endPos = activeEditor.document.positionAt(end);
              const { trimStart, trimEnd } = trimWhiteSpace(code, startPos, endPos);
              const range = new vscode.Range(trimStart, trimEnd);

              matches.push({ range, text: text.trim(), isString: false });
            }
          }
        });
        break;
      }

      case ts.SyntaxKind.TemplateExpression: {
        const { pos, end } = node;
        let templateContent = code.slice(pos, end);
        templateContent = templateContent.toString().replace(/\$\{[^\}]+\}/, '');
        if (templateContent.match(DOUBLE_BYTE_REGEX)) {
          const start = node.getStart();
          const end = node.getEnd();
          /** 加一，减一的原因是，去除`号 */
          const startPos = activeEditor.document.positionAt(start + 1);
          const endPos = activeEditor.document.positionAt(end - 1);
          const range = new vscode.Range(startPos, endPos);
          matches.push({
            range,
            text: code.slice(start + 1, end - 1),
            isString: true
          });
        }
        break;
      }

      case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
        const { pos, end } = node;
        let templateContent = code.slice(pos, end);
        templateContent = templateContent.toString().replace(/\$\{[^\}]+\}/, '');
        if (templateContent.match(DOUBLE_BYTE_REGEX)) {
          const start = node.getStart();
          const end = node.getEnd();
          /** 加一，减一的原因是，去除`号 */
          const startPos = activeEditor.document.positionAt(start + 1);
          const endPos = activeEditor.document.positionAt(end - 1);
          const range = new vscode.Range(startPos, endPos);
          matches.push({
            range,
            text: code.slice(start + 1, end - 1),
            isString: true
          });
        }
    }

    ts.forEachChild(node, visit);
  }
  ts.forEachChild(ast, visit);

  return matches;
}

function findTextInVueTs(code: string, fileName: string, startNum: number) {
  const matches: any = [];
  const activeEditor = vscode.window.activeTextEditor as vscode.TextEditor;
  const ast = ts.createSourceFile('', code, ts.ScriptTarget.ES2015, true, ts.ScriptKind.TS);

  function visit(node: ts.Node) {
    switch (node.kind) {
      case ts.SyntaxKind.StringLiteral: {
        /** 判断 Ts 中的字符串含有中文 */
        const { text } = node as ts.StringLiteral;
        if (text.match(DOUBLE_BYTE_REGEX)) {
          const start = node.getStart();
          const end = node.getEnd();
          /** 加一，减一的原因是，去除引号 */
          const startPos = activeEditor.document.positionAt(start + 1 + startNum);
          const endPos = activeEditor.document.positionAt(end - 1 + startNum);
          const range = new vscode.Range(startPos, endPos);
          matches.push({ range, text, isString: true });
        }
        break;
      }

      case ts.SyntaxKind.TemplateExpression: {
        const { pos, end } = node;
        let templateContent = code.slice(pos, end);
        templateContent = templateContent.toString().replace(/\$\{[^\}]+\}/, '');
        if (templateContent.match(DOUBLE_BYTE_REGEX)) {
          const start = node.getStart();
          const end = node.getEnd();
          /** 加一，减一的原因是，去除`号 */
          const startPos = activeEditor.document.positionAt(start + 1 + startNum);
          const endPos = activeEditor.document.positionAt(end - 1 + startNum);
          const range = new vscode.Range(startPos, endPos);
          matches.push({
            range,
            text: code.slice(start + 1, end - 1),
            isString: true
          });
        }
        break;
      }
    }

    ts.forEachChild(node, visit);
  }
  ts.forEachChild(ast, visit);

  return matches;
}
/**
 * 查找 HTML 文件中的中文
 * @param code
 */
function findTextInHtml(code: string) {
  const matches: any = [];
  const activeEditor = vscode.window.activeTextEditor as vscode.TextEditor;
  const ast = compiler.parseTemplate(code, 'ast.html', { preserveWhitespaces: false });

  function visit(node: any) {
    const value = node.value;
    if (value && typeof value === 'string' && value.match(DOUBLE_BYTE_REGEX)) {
      const valueSpan = node.valueSpan || node.sourceSpan;
      let {
        start: { offset: startOffset },
        end: { offset: endOffset }
      } = valueSpan;
      const nodeValue = code.slice(startOffset, endOffset);
      let startPos, endPos;
      let isString = false;
      /** 处理带引号的情况 */
      if (nodeValue.charAt(0) === '"' || nodeValue.charAt(0) === "'") {
        startPos = activeEditor.document.positionAt(startOffset + 1);
        endPos = activeEditor.document.positionAt(endOffset - 1);
        isString = true;
      } else {
        startPos = activeEditor.document.positionAt(startOffset);
        endPos = activeEditor.document.positionAt(endOffset);
      }
      const { trimStart, trimEnd } = trimWhiteSpace(code, startPos, endPos);
      const range = new vscode.Range(trimStart, trimEnd);
      matches.push({ range, text: value, isString });
    } else if (value && typeof value === 'object' && value.source && value.source.match(DOUBLE_BYTE_REGEX)) {
      // <span>{{expression}}中文</span> 这种情况的兼容
      const chineseMatches = value.source.match(DOUBLE_BYTE_REGEX);
      chineseMatches.map((match: any) => {
        const valueSpan = node.valueSpan || node.sourceSpan;
        let {
          start: { offset: startOffset },
          end: { offset: endOffset }
        } = valueSpan;
        const nodeValue = code.slice(startOffset, endOffset);
        const start = nodeValue.indexOf(match);
        const end = start + match.length;
        let startPos = activeEditor.document.positionAt(startOffset + start);
        let endPos = activeEditor.document.positionAt(startOffset + end);
        const { trimStart, trimEnd } = trimWhiteSpace(code, startPos, endPos);
        const range = new vscode.Range(trimStart, trimEnd);
        matches.push({ range, text: match[0], isString: false });
      });
    }

    if (node.children && node.children.length) node.children.forEach(visit);
    if (node.attributes && node.attributes.length) node.attributes.forEach(visit);
  }

  if (ast.nodes && ast.nodes.length) ast.nodes.forEach(visit);

  return matches;
}

/**
 * vue文件查找
 * @param code
 * @param fileName
 * @question $符敏感
 */
function findTextInVue(code: string, fileName: string) {
  const activeTextEditor = vscode.window.activeTextEditor as vscode.TextEditor;
  const matches: any = [];
  const { document } = activeTextEditor;
  const vueObejct = compilerVue.compile(code.toString(),{outputSourceRange: true});
  let vueAst = vueObejct.ast;
  let expressTemp = findVueText(vueAst);

  expressTemp.forEach((item: any) => {
    const nodeValue = code.slice(item.start, item.end);
    let startPos, endPos;
    if (item.isText) {
      if (item.hasBr) {
        startPos = document.positionAt(item.start);
        endPos = document.positionAt(item.end);
      } else {
        startPos = document.positionAt(item.start + nodeValue.indexOf(item.text));
        endPos = document.positionAt(item.start+nodeValue.indexOf(item.text) + (item.text.length));
      }
    } else {
      startPos = document.positionAt(item.start + nodeValue.indexOf(item.text) + 1);
      endPos = document.positionAt(item.start+nodeValue.indexOf(item.text) + (item.text.length - 1));
    }
    const range = new vscode.Range(startPos, endPos);
    matches.push({
      arrf: [item.start, item.end],
      range,
      text: item.text.trimRight(),
      isString: true
    });
  });

  let outcode = vueObejct.render.toString().replace('with(this)', 'function a()');
  let vueTemp = transerI18n(outcode, 'as.vue');
  /**删除所有的html中的头部空格 */
  vueTemp = vueTemp.map((item: string) => item.trim());
  vueTemp = [...new Set(vueTemp)];
  vueTemp.forEach((item: any) => {
    let rex = new RegExp(item, 'g');
    let result;
    while ((result = rex.exec(code))) {
      let res = result;
      let last = rex.lastIndex;
      last = last - (res[0].length - res[0].trimRight().length);
      const range = new vscode.Range(document.positionAt(res.index), document.positionAt(last));
      const part1 = code.substr(res.index - 1, 1);
      const part2 = code.substr(last, 1);

      matches.push({
        arrf: [res.index, last],
        range,
        text: res[0].trimRight(),
        isString: (part1 === '"' && part2 === '"') || (part1 === "'" && part2 === "'")
      });
    }
  });

  const matchesTempResult = matches.filter((itemA: any) => {
    return matches.every((itemB: any) => {
      const [a0, a1] = itemA.arrf;
      const [b0, b1] = itemB.arrf;
      return [
        (a0 > b0 && a1 <= b1),
        (a0 >= b0 && a1 < b1),
        (a0 > b0 && a1 < b1)
      ].every(v => !v);
    });
  });
  const sfc = compilerVue.parseComponent(code.toString());
  const sfcs = sfc.script;

  return sfcs
    ? matchesTempResult.concat(findTextInVueTs(sfcs.content, fileName, sfcs.start as number))
    : matchesTempResult;
}
/**
 * 递归匹配代码的中文
 * @param code
 */
export function findChineseText(code: string, fileName: string) {
  if (fileName.endsWith('.html')) return findTextInHtml(code);
  if (fileName.endsWith('.vue')) return findTextInVue(code, fileName);
  return findTextInTs(code, fileName);
}
