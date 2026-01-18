const vscode = require('vscode');
const { exec } = require('child_process');
const path = require('path');
const sm = require('./scripts/split_markdown');
const OpenAI = require('openai');

async function activate(context) {
  
  // console.log('您的扩展已被激活！');

  // 注册命令
  let disposable = vscode.commands.registerCommand('chat-in-markdown.sentChat', async () => {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor || activeEditor.document.languageId !== 'markdown') {
      vscode.window.showErrorMessage('Active file is not a Markdown document!');
      return;
    }

    const content = activeEditor.document.getText(); // 获取整个文档内容
    const position = activeEditor.selection.active;  // 获取光标位置
    const line = position.line;  // 获取光标所在行
    const configuration = vscode.workspace.getConfiguration('chat-in-markdown');
    const apiKey = configuration.get('apiKey');
    const baseURL = configuration.get('baseURL');
    const model = configuration.get('model');

    if (!apiKey) {
      vscode.window.showErrorMessage('LLM API Key not set!');
      return;
    }

    if (!baseURL) {
      vscode.window.showErrorMessage('LLM Base URL not set!');
      return;
    }

    if (!model) {
      vscode.window.showErrorMessage('LLM Model not set!');
      return;
    }

    await main(content, line, apiKey, baseURL, model, activeEditor);
  });

  context.subscriptions.push(disposable);
}

async function main(content, cursorLine, apiKey, baseURL, model, activeEditor) {
  
  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
  });

  lines = content.split('\n')
  const [prevH1Line, nextH1Line] = sm.getCurrentH1Chapter(lines, cursorLine);
  const this_h1p_lines = lines.slice(prevH1Line, nextH1Line);
  const h2ps = sm.splitH2Chapter(this_h1p_lines);
  
  // 拼接消息
  const messages = [];
  for (const h2p of h2ps) {
    const [head, text] = sm.splitH2Head(h2p);
    messages.push({ "role": head, "content": text });
  }

  // Streaming:
  const stream = await openai.chat.completions.create({
    messages: messages,
    model: model,
    stream: true,
  });

  let insertPosition = new vscode.Position(nextH1Line, activeEditor.document.lineAt(nextH1Line-1).text.length);

  const aswTitle = '\n' + '## assistant' + '\n';
  insertPosition = await insertTextAndReturnNewPosition(aswTitle, insertPosition, activeEditor);

  let fullResponse = ''; // 新建一个变量用于储存大模型流式输出
  for await (const part of stream) {
    const content = part.choices[0]?.delta?.content || '';
    if (content) {
    fullResponse += content; // 将内容追加到 fullResponse 变量中
    insertPosition = await insertTextAndReturnNewPosition(content, insertPosition, activeEditor);
    }
  }
  
  // 检查大模型的流式输出是否包含标题，若包含标题则将标题下调两级
  const responseHeads = sm.getAllHead(fullResponse);
  for (const head of responseHeads) {
    let headsPos = new vscode.Position(head + nextH1Line + 1, 0)
    insertPosition = await insertTextAndReturnNewPosition('##', headsPos, activeEditor);
  }
}

/**
 * 插入文本并更新光标位置
 * @param {string} text 要插入的文本
 * @param {vscode.Position} position 插入文本的起始位置
 * @param {vscode.TextEditor} editor 当前的 VS Code 编辑器对象
 * @returns {Promise<vscode.Position>} 返回插入文本后新的光标位置
 */
async function insertTextAndReturnNewPosition(text, position, editor) {
  const lines = text.split('\n'); // 将文本按行分割
  let newPosition;

  // 插入操作
  const success = await editor.edit(editBuilder => {
      editBuilder.insert(position, text);  // 插入文本
  });

  if (success) {
      console.log('Text inserted successfully!');
  } else {
      console.log('Failed to insert text.');
      return position;  // 如果插入失败，返回原位置
  }

  // 计算插入后的光标位置
  if (lines.length === 1) {
      // 插入的是单行文本，光标应该移动到文本的末尾
      newPosition = new vscode.Position(position.line, position.character + text.length);
  } else {
      // 插入的是多行文本，光标应该跳到插入文本的最后一行的末尾
      newPosition = new vscode.Position(position.line + lines.length - 1, lines[lines.length - 1].length);
  }

  // 返回新的光标位置
  return newPosition;
}

function deactivate() {
}

module.exports = { activate, deactivate };