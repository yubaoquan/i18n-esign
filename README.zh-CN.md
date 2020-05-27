# i18n-esign

简单的 VSCode 插件, 一看就会用

<p align='center'>
<a href="https://github.com/yubaoquan/i18n-esign/blob/master/README.md">English</a> | 简体中文
</p>

## 功能

1. 用于合并多个 json 语言文件, 生成包含多个语言的 Excel 文件;
2. 根据 Excel 文件, 更新 json 语言文件;
3. 中文标红;

![laa2.gif](https://i.loli.net/2020/04/30/kt1QnPuefgpKWAr.gif)

源文件:

![src-code.png](https://i.loli.net/2020/04/30/RQK6PzqrG1DxBAV.png)

合并结果:

![Excel.png](https://i.loli.net/2020/04/30/LDnbU3VsR1TaFHi.png)

## Requirements

目前无要求

## 配置项

- languageTypes: 默认值`["zh-CN", "en-US"]`. 插件将抽取所有以这种标识命名的 json 文件(如en-US.json, zh-CN.json)然后生成 Excel, 这些语言标识也会作为 Excel 中的列名.
- enableLinter: 将非英文字符高亮框出来, 便于查看.
- markColor: 非英文字符的高亮颜色.

## 已知问题

目前没有

## 更新记录

### 0.0.1

第一版

### 0.0.2

更新 readme

### 0.0.3

更新 readme

### 0.1.0

添加高亮功能. 中文将被红框标出, 便于查看未翻译的地方.
部分代码来自 [kiwi-linter](https://github.com/alibaba/kiwi/tree/master/kiwi-linter)

### 0.1.1
添加 ts 依赖

### 0.1.2
将 ts 从 devDependency 移动到 dependency

### 0.1.3
添加依赖

### 0.2.0
新功能:

  1. 支持多级目录探测 json 语言文件;
  2. 根据 Excel 文件内容反向更新 json 语言文件;

部分代码来自 [vscode-advanced-new-file](https://github.com/patbenatar/vscode-advanced-new-file)

### 0.2.1
修复中文红框不显示的bug.

### 0.2.2
修正 json 文件内容不符合 json 规范时引发的错误

### 0.3.0
修正 json 文件修改之后再次抽取的excel抽取不到新增词条的bug
变更 excel 文件名格式

### 0.3.1
发布时排除依赖文件

### 0.3.2
webpack 打包

**Enjoy!**
