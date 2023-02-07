/* eslint no-console: ["error", { allow: ["log", "warn", "error"] }] */
const commandLineArgs = require('command-line-args');
const fs = require('fs');
const glob = require('glob');

const optionDefinitions = [
  { name: 'dir', alias: 'd' },
  {
    name: 'html-path',
    alias: 'h',
    defaultValue: 'heading_order_violations.html',
  },
  {
    name: 'json-path',
    alias: 'j',
    defaultValue: 'heading_order_violations.json',
  },
];
const options = commandLineArgs(optionDefinitions);

if (options.help || !options.dir) {
  process.exit(0);
}

function escape(s) {
  const lookup = {
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;',
    '<': '&lt;',
    '>': '&gt;',
  };
  return s.replace(/[&"'<>]/g, c => lookup[c]);
}

const htmlFiles = glob.sync(`${options.dir}/**/*.html`);

let htmlOutput = '<html><body>';
const jsonData = {
  totalViolations: 0,
  totalFilesWithViolations: 0,
  totalFiles: 0,
};

htmlFiles.forEach((filename, index, array) => {
  console.error(`Processing file ${index} of ${array.length}`);
  try {
    const data = fs
      .readFileSync(filename, 'utf8')
      .match(new RegExp(/<article(.*?)<\/article/, 'gsm'));
    const data2 = (data ? data[0] : '') || '';
    const badHeadings = data2.match(
      new RegExp(
        /(<h1((?!<h[12]).)*?<h[3-6]|<h2((?!<h[1-3]).)*?<h[4-6]|<h3((?!<h[1-4]).)*?<h[56]|<h4((?!<h[1-5]).)*?<h6)/,
        'gsm',
      ),
    );
    if (badHeadings) {
      const url = filename.replace('./build/vagovdev/', 'https://www.va.gov/');
      const link = `<h1><a href="${url}">${filename}</a></h1>`;
      htmlOutput += link;
      badHeadings.forEach(text => {
        const text2 = escape(text);
        htmlOutput += `<pre>${text2}</pre>`;
      });
      jsonData.totalViolations += badHeadings.length;
      jsonData.totalFilesWithViolations += 1;
    }
  } catch (err) {
    console.error(err);
  }
});

jsonData.totalFiles = htmlFiles.length;

htmlOutput += '</body></html>';
const jsonOutput = JSON.stringify(jsonData, null, 2);

fs.writeFileSync(options['html-path'], htmlOutput);
fs.writeFileSync(options['json-path'], jsonOutput);
