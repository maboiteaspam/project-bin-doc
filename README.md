# project-bin-doc

Generate documentation of your project.

if you provide a gh-branch on which commit, it will realize it for you.

Use the most suitable tool to document your project.

YUIDoc, ApiDoc, JsDoc, JsDox, mocha TOC.

# Install

```sh
npm i project-bin-doc -g
```

You will need to install appropriate binary separately.

```sh
npm i yuidoc -g
npm i apidoc -g
npm i jsdoc -g
npm i jsdox -g
npm i mocha -g

... etc

```

# Usage

```sh
  Usage: project-doc [env]

  Generate documentation

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
```

# Configuration

Create a ```.local.json``` file on root directory of your project.

```json
{
  "profileData":{
    "github":{
      "username":"TO UPDATE",
      "password":"TO UPDATE"
    },
    "doc":{
      "ghBranch":"TO UPDATE",
      "outpath":"/some/path", // if not set, it is a temp directory
      "jsdox":{
        "paths":{
          "index.js":"jsdox/"
        }
      },
      "jsdoc":{
        "paths":{
          "index.js":"jsdoc/"
        }
      },
      "yuidoc":{
        "paths":{
          "":"yuidoc/"
        },
        "selleck":true,
        "lint":true,
        "exclude":['some','pattern','see','yuidoc','doc'],
        "helpers":['some','path','see','yuidoc','doc'],
        "syntaxtype":"js",
        "themedir":"/some/path"
      },
      "docco":{
        "paths":{
          "index.js":"docco/"
        },
        "layout":"",
        "extension":"",
        "languages":"",
        "marked":"",
        "template":""
      },
      "apidoc":{
        "paths":{
          "index.js":"apidoc/"
        },
        "filters":".*\\.js$",
        "template":"mytemplate/"
      },
      "mocha": true
    }
  }
}
```

```project-bin-doc``` will ensure ```.local.json``` file 
is added to ```.gitignore``` file.

## YuiDoc

Note that the project will always import a yuidoc helper by default.


This helper read a file and inject its content into your documentation.

Usage

```{{#F "path"}}{{/F}}```


yuidoc-include-helper.js

```js
module.exports = {
  F: function(filePath) {
    return require('fs').readFileSync(filePath, 'utf8').toString();
  }
};
```