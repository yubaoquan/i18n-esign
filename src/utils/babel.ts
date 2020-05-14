import * as babel from '@babel/core';
import { DOUBLE_BYTE_REGEX } from '../linter/const';
import * as ts from 'typescript';

function transerI18n(code: string, filename: string, lang?: string) {
  if (lang === 'ts') {
    return typescriptI18n(code, filename);
  } else {
    return javascriptI18n(code, filename);
  }
}

function typescriptI18n(code: string, fileName: string) {
  let arr: any = [];
  const ast = ts.createSourceFile('', code, ts.ScriptTarget.ES2015, true, ts.ScriptKind.TS);
  function visit(node: ts.Node) {
    switch (node.kind) {
      case ts.SyntaxKind.StringLiteral: {
        /** 判断 Ts 中的字符串含有中文 */
        const { text } = node as ts.StringLiteral;
        if (text.match(DOUBLE_BYTE_REGEX)) {
          arr.push(text);
        }
        break;
      }
    }
    ts.forEachChild(node, visit);
  }
  ts.forEachChild(ast, visit);
  return arr;
}

function javascriptI18n(code: string, filename: string) {
  let arr: any = [];
  let visitor = {
    StringLiteral(path: any) {
      if (path.node.value.match(DOUBLE_BYTE_REGEX)) {
        arr.push(path.node.value);
      }
    }
  };
  let arrayPlugin = { visitor };
  babel.transform(code.toString(), {
    filename,
    plugins: [arrayPlugin]
  });
  return arr;
}

function isTextChild(ast: any) {
  const isTextNode = ast.type === 3;
  const containsChinese = ast.text && ast.text.replace(/\n/g, '').match(DOUBLE_BYTE_REGEX);

  return isTextNode && containsChinese;
}

//必须将模板语法中的所有代翻译语句翻译完成才能进行ast的string解析
function findVueText (ast: any) {
  let arr: any = [];
  const regex1 = /\`(.+?)\`/g;
  function emun(ast: any) {
    let { start, end } = ast;
    if (ast.expression) {
      let text = ast.expression.match(regex1);
      if (text && text[0].match(DOUBLE_BYTE_REGEX)) {
        text.forEach((itemText: string)=>{
          itemText.match(DOUBLE_BYTE_REGEX) && arr.push({ text: itemText, start, end });
        });
      }
    }
    else if (isTextChild(ast)) {
      let textStart = start;
      let textEnd = end;

      // 将红框中的回车符和空格去掉
      const hasBr = ast.text.includes('\n');
      if (hasBr) {
        const matchResult = ast.text.match(/^([\s\n]*)|([\s\n]*)$/g);

        if (matchResult && matchResult[0]) {
          textStart += matchResult[0].length;
        }
        if (matchResult && matchResult[1]) {
          textEnd -= matchResult[1].length;
        }
      }
      arr.push({ text: ast.text, start: textStart, end: textEnd, isText: true, hasBr });
    }
    else {
      ast.children && ast.children.forEach((item: any)=> emun(item));
    }
  }
  emun(ast);
  return arr;
}
export { transerI18n, findVueText };
