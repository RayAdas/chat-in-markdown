const markdown = require('markdown-it')();

function getCurrentH1Chapter(lines, cursorLine) {
    const decodedLines = lines.map(line => markdown.render(line));
    const h1Pattern = /<h1>.*?<\/h1>/;
    const h1Lines = decodedLines.map((line, i) => h1Pattern.test(line) ? i : -1).filter(i => i !== -1);

    let prevH1Line = null;
    let nextH1Line = null;

    for (let i of h1Lines) {
        if (i <= cursorLine) {
            prevH1Line = i;
        } else if (i > cursorLine && nextH1Line === null) {
            nextH1Line = i;
            break;
        }
    }

    if (prevH1Line === null) {
        throw new Error("No previous H1 header found");
    }

    if (nextH1Line === null) {
        nextH1Line = lines.length;
    }

    return [prevH1Line, nextH1Line];
}

function splitH2Chapter(lines) {
    const decodedLines = lines.map(line => markdown.render(line));
    const h2Pattern = /<h2>.*?<\/h2>/;
    const h2Lines = decodedLines.map((line, i) => h2Pattern.test(line) ? i : -1).filter(i => i !== -1);

    if (h2Lines.length === 0) {
        throw new Error("No previous H2 header found");
    }

    const chapters = [];
    let startLine = h2Lines[0];

    h2Lines.shift();

    for (let h2Line of h2Lines) {
        chapters.push(lines.slice(startLine, h2Line).join('\n'));
        startLine = h2Line;
    }

    chapters.push(lines.slice(startLine).join('\n'));

    return chapters;
}

function splitH2Head(content) {
    const lines = content.split('\n');
    const head = markdown.render(lines[0]);
    const h2Pattern = /<h2>(.*?)<\/h2>/;
    const headMatch = head.match(h2Pattern);
    const headText = headMatch ? headMatch[1] : '';

    const text = lines.slice(1).join('\n');
    return [headText, text];
}

function getAllHead(content) {
    const lines = content.split('\n');
    const decodedLines = lines.map(line => markdown.render(line));
    const hdPattern = /<h[0-9]>.*?<\/h[0-9]>/;//匹配h1-h9。本来markdown只支持到h6，但是都匹配一下
    const hdLines = decodedLines.map((line, i) => hdPattern.test(line) ? i : -1).filter(i => i !== -1);
    return hdLines;
}

module.exports = {
    getCurrentH1Chapter,
    splitH2Chapter,
    splitH2Head,
    getAllHead
};
