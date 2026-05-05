const fs = require('node:fs')
const path = require('node:path')

const replacements = [
  {
    file: path.join('node_modules', 'http-proxy', 'lib', 'http-proxy', 'index.js'),
    from: "extend    = require('util')._extend,",
    to: 'extend    = Object.assign,',
  },
  {
    file: path.join('node_modules', 'http-proxy', 'lib', 'http-proxy', 'common.js'),
    from: "extend   = require('util')._extend,",
    to: 'extend   = Object.assign,',
  },
]

for (const replacement of replacements) {
  const target = path.resolve(__dirname, '..', replacement.file)

  if (!fs.existsSync(target)) {
    continue
  }

  const source = fs.readFileSync(target, 'utf8')

  if (source.includes(replacement.to)) {
    continue
  }

  if (!source.includes(replacement.from)) {
    throw new Error(`Could not find expected http-proxy code in ${replacement.file}`)
  }

  fs.writeFileSync(target, source.replace(replacement.from, replacement.to))
}
