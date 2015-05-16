# project-bin-doc

Generate documentation of your project and push it to a git branch.
JsDoc, JsDox, mocha.

# Install

```sh
npm i project-bin-doc -g
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
      "jsdox":{
        "index.js":"docs/"
      },
      "jsdoc":{
        "index.js":"docs/"
      },
      "mocha": true
    }
  }
}
```

```project-bin-doc``` will ensure ```.local.json``` file 
is added to ```.gitignore``` file.
